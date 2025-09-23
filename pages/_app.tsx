import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { NotificationProvider } from '../contexts/NotificationContext';

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
    heading: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif",
    body: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        fontFamily: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif",
      },
      '*': {
        fontFamily: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif !important",
      },
      'h1, h2, h3, h4, h5, h6': {
        fontFamily: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif !important",
      },
      'p, span, div, td, th, input, select, textarea, button': {
        fontFamily: "'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif !important",
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // These pages handle their own layout, so don't wrap them
  const pagesWithOwnLayout = ['/reports', '/monthly-summary'];
  const shouldWrapWithLayout = !pagesWithOwnLayout.includes(router.pathname);
  
  if (shouldWrapWithLayout) {
    // Most pages use the standard Layout wrapper
    return (
      <ChakraProvider theme={theme}>
        <NotificationProvider>
          <Head>
            <title>Innogy Tahsilat - Payment Reporting Automation</title>
            <meta name="description" content="AI-powered payment reporting automation system for real estate companies" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </NotificationProvider>
      </ChakraProvider>
    );
  }
  
  // These pages handle their own layout
  return (
    <ChakraProvider theme={theme}>
      <NotificationProvider>
        <Head>
          <title>Innogy Tahsilat - Payment Reporting Automation</title>
          <meta name="description" content="AI-powered payment reporting automation system for real estate companies" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Component {...pageProps} />
      </NotificationProvider>
    </ChakraProvider>
  );
}

export default MyApp;