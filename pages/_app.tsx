import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Layout from '../components/Layout';

// Extend the theme to include custom colors, fonts, etc.
const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f2ff',
      100: '#b8daff',
      200: '#8bc3ff',
      300: '#5babff',
      400: '#2c93ff',
      500: '#0077ff', // primary color
      600: '#005ecc',
      700: '#004599',
      800: '#002b66',
      900: '#001233',
    },
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>Tahsilat Raporu - Payment Reporting Automation</title>
        <meta name="description" content="AI-powered payment reporting automation system for real estate companies" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChakraProvider>
  );
}

export default MyApp;