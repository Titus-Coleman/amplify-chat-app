import "@aws-amplify/ui-react/styles.css";
import { Amplify } from "aws-amplify";
import awsconfig from "../aws-exports";
Amplify.configure({ ...awsconfig, ssr: true });

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
