# CryptoVault Exit Strategy Simulator

CryptoVault is a sophisticated, client-side tool designed for cryptocurrency investors to track their portfolio, simulate various exit strategies, and visualize potential growth. Users can manually add tokens, input their investment details, and set target market caps to project future profits.

## Features

- **Portfolio Tracking**: Add tokens with details like amount, entry price, and current market data.
- **Live Price Updates**: Automatically fetches the latest market data from the DexScreener API.
- **Privacy Mode**: Hide all sensitive balance and value information with a single click.
- **Top Opportunities**: Highlights the top 5 tokens with the highest growth potential based on your targets.
- **Exit Strategy Simulation**: Compare the potential outcomes of different exit strategies, from a simple "All at Target" to complex, multi-stage laddered exits.
- **AI Strategy Generator**: Generate a custom, staged exit plan based on your desired profit and risk tolerance.
- **Data Visualization**: View your portfolio's historical performance and current asset composition with interactive charts.
- **Data Management**: Easily import and export your entire portfolio as a JSON or CSV file.
- **Theme Support**: Switch between a sleek dark mode and a clean light mode.

## Tech Stack

- **Framework**: React 19 (using TypeScript)
- **Styling**: Tailwind CSS
- **Charting**: Recharts
- **Dependencies**: Loaded via an `importmap` from a CDN (for simple development).

## Running the Application Locally

Since this project is set up without a traditional build step, running it locally is very simple.

1.  **Prerequisites**: You need a modern web browser that supports ES modules.
2.  **Serve the Files**: You need a simple local web server to serve the project files. One of the easiest ways is to use the `serve` package.
    - If you don't have `serve` installed, open your terminal and run:
      ```bash
      npm install -g serve
      ```
    - Navigate to the project's root directory in your terminal and run:
      ```bash
      serve
      ```
    - The server will start, and you can access the application at the URL it provides (usually `http://localhost:3000`).

## Future Enhancements & Best Practices

To evolve this project into a production-grade application, the following steps are highly recommended.

### 1. Introduce a Build Step

The current CDN-based setup is great for simplicity but not for performance or scalability.

- **Recommendation**: Use a modern build tool like **Vite**.
- **Benefits**:
    - **Bundling & Minification**: Reduces the size of your files for faster load times.
    - **Developer Experience**: Provides an incredibly fast development server with Hot Module Replacement (HMR).
    - **Package Management**: Allows you to manage dependencies professionally using a `package.json` file with `npm` or `yarn`.

### 2. Implement Automated Testing

To ensure long-term stability and prevent regressions, a robust testing suite is essential.

- **Unit Tests**: Use **Vitest** with **React Testing Library** to test individual components and utility functions.
  - **Priority**: Functions in `utils/portfolioCalculations.ts` and `utils/formatters.ts` should be the first to have tests, as they contain critical business logic.
- **End-to-End (E2E) Tests**: Use **Cypress** or **Playwright** to simulate user journeys (e.g., adding a token, editing it, checking the portfolio value, deleting the token).

### 3. Deploy to a Modern Host

- **Recommendation**: Use a platform like **Vercel** or **Netlify**.
- **Benefits**:
    - **Continuous Deployment (CI/CD)**: Automatically build and deploy your application whenever you push changes to your Git repository.
    - **Global CDN**: Serves your application from edge locations around the world for a faster user experience.
    - **HTTPS & Security**: Handles SSL certificates and other security best practices automatically.