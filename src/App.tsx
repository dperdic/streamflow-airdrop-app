import Footer from "@components/layout/Footer";
import Header from "@components/layout/Header";
import Main from "@components/layout/Main";
import Providers from "@providers/Providers";

export default function App() {
  return (
    <Providers>
      <Header />
      <Main />
      <Footer />
    </Providers>
  );
}
