export default [
  {
    input: "src/index.js",
    output: {
      file: "index.js",
      format: "cjs"
    }
  },
  {
    input: "src/index.js",
    output: {
      file: "index.mjs",
      format: "es"
    }
  }
];
