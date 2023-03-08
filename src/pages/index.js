import { Inter } from "@next/font/google";
import { useEffect, useState } from "react";
import styles from "@/styles/Home.module.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { API, Auth, graphqlOperation, withSSRContext } from "aws-amplify";
import { listMessages } from "@/graphql/queries";
import { createMessage } from "@/graphql/mutations";
import Message from "@/components/message";
import { onCreateMessage } from "@/graphql/subscriptions";

const inter = Inter({ subsets: ["latin"] });

function Home({ messages }) {
  const [stateMessages, setStateMessages] = useState([...messages]);
  const [messageText, setMessageText] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const amplifyUser = await Auth.currentAuthenticatedUser();
        setUser(amplifyUser);
      } catch (err) {
        setUser(null);
      }
    };

    fetchUser();

    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
    ).subscribe({
      next: ({ provider, value }) => {
        setStateMessages((stateMessages) => [
          ...stateMessages,
          value.data.onCreateMessage,
        ]);
      },
      error: (error) => console.warn(error),
    });
  }, []);

  useEffect(() => {
    async function getMessages() {
      try {
        const messagesReq = await API.graphql({
          query: listMessages,
          authMode: "AMAZON_COGNITO_USER_POOLS",
        });
        setStateMessages([...messagesReq.data.listMessages.items]);
      } catch (error) {
        console.error(error);
      }
    }
    getMessages();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessageText("");
    console.log(event.target.value);

    const input = {
      message: messageText,
      owner: user.username,
    };

    try {
      await API.graphql({
        authMode: "AMAZON_COGNITO_USER_POOLS",
        query: createMessage,
        variables: {
          input: input,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (user) {
    return (
      <div className={styles.background}>
        <div className={styles.container}>
          <h1 className={styles.title}> AWS Amplify Live Chat</h1>
          <div className={styles.chatbox}>
            {stateMessages
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((message, index) => (
                <Message
                  message={message}
                  user={user}
                  isMe={user.username === message.owner}
                  key={index}
                />
              ))}
            {console.log(stateMessages)}
          </div>
          <div className={styles.formContainer}>
            <form className={styles.formBase} onSubmit={handleSubmit}>
              <input
                type="text"
                name="message"
                id="message"
                autoFocus
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="send a message"
                className={styles.textBox}
              />
              <button style={{ marginLeft: "8px" }}>Send</button>
            </form>
          </div>
        </div>
      </div>
    );
  } else {
    return <p>Loading...</p>;
  }
}

export default withAuthenticator(Home);

export async function getServerSideProps({ req }) {
  //Use withSSRContext to deploy Amplify features serverside
  const SSR = withSSRContext({ req });
  try {
    //checks if the user is signed in or will throw an error
    const user = await SSR.Auth.currentAuthenticatedUser();

    //user is auth'd so continue below
    const response = await SSR.API.graphql({
      query: listMessages,
      //authMode: Uses Amazon Cognito to make a request on behalf of the current user.
      authMode: "AMAZON_COGNITO_USER_POOLS",
    });

    return {
      props: {
        messages: response.data.listMessages.items,
      },
    };
  } catch (error) {
    return {
      props: {
        messages: [],
      },
    };
  }
}
