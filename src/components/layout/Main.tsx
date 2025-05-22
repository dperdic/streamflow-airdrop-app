import AirdropDetails from "@components/AirdropDetails";
import Home from "@components/Home";
import NotFound from "@components/NotFound";
import { Route, Routes } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Main() {
  return (
    <main className="mt-18 flex h-full w-full flex-grow px-8 py-8 sm:px-16">
      <div className="mx-auto w-full max-w-7xl">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/airdrops/:id" element={<AirdropDetails />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover={true}
        theme="light"
        transition={Slide}
      />
    </main>
  );
}
