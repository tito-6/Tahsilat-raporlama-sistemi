import { useEffect } from 'react';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function LogoutPage() {
  useEffect(() => {
    // Clear any local/session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force a full page reload to trigger authentication
    setTimeout(() => {
      // Redirect to a special logout endpoint that returns 401
      window.location.href = '/api/auth/logout-redirect';
    }, 1500);
  }, []);

  return (
    <Box 
      height="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      bg="gray.50"
    >
      <VStack spacing={4}>
        <Spinner size="xl" color="blue.500" />
        <Text fontSize="lg" fontWeight="medium">
          Logging you out...
        </Text>
        <Text color="gray.600" textAlign="center">
          You will be redirected to the login page shortly.
        </Text>
      </VStack>
    </Box>
  );
}