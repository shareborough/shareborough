export default function Footer() {
  return (
    <footer className="text-center text-sm text-gray-400 dark:text-gray-500 py-8 mt-auto">
      Created with{" "}
      <span role="img" aria-label="black heart">
        🖤
      </span>{" "}
      on{" "}
      <a
        href="https://allyourbase.io"
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Allyourbase
      </a>
    </footer>
  );
}
