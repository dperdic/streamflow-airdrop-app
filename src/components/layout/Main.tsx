import Home from "@components/Home";

export default function Main() {
  return (
    <main className="mt-18 flex h-full w-full grow justify-center px-8 py-8 sm:px-16">
      <div className="mx-auto w-full max-w-4xl">
        <main className="flex flex-col items-center p-8">
          <Home />
        </main>
      </div>
    </main>
  );
}
