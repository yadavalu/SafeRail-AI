// import type { Config } from 'tailwindcss'

// // This is a configuration file for Tailwind CSS v4.
// // We are explicitly defining the content paths to ensure that the compiler
// // finds all the utility classes used in the project.
// const config: Config = {
//   content: [
//     './src/app/**/*.{js,ts,jsx,tsx,mdx}',
//     './src/components/**/*.{js,ts,jsx,tsx,mdx}',
//   ],
// }
// export default config

module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
