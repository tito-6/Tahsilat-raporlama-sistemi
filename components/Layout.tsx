import React, { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  sidebarProps?: any; // Props to pass to the sidebar for dynamic content
}

const Layout: React.FC<LayoutProps> = ({ children, sidebarProps }) => {
  return (
    <Flex h="100vh" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
      <Sidebar {...sidebarProps} />
      <Box flex="1" overflow="auto">
        <Header />
        <Box as="main" p={2} w="100%" maxW="none" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
          {children}
        </Box>
      </Box>
    </Flex>
  );
};

export default Layout;