import React from 'react';
import {
  Box,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  Divider,
  useColorModeValue,
  Heading
} from '@chakra-ui/react';
import { FiBell, FiSettings, FiLogOut } from 'react-icons/fi';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Get the current page title based on the route
  const getPageTitle = () => {
    switch(router.pathname) {
      case '/':
        return 'Dashboard';
      case '/import':
        return 'Import Data';
      case '/payments':
        return 'Payment Data';
      case '/reports':
        return 'Reports';
      case '/assistant':
        return 'AI Assistant';
      default:
        return 'Tahsilat Raporu';
    }
  };

  return (
    <Box
      as="header"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={6}
      py={4}
    >
      <Flex justify="space-between" align="center">
        <Heading as="h1" size="lg">
          {getPageTitle()}
        </Heading>

        <Flex align="center">
          {/* Notification icon */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FiBell />}
              variant="ghost"
              aria-label="Notifications"
              fontSize="lg"
              mr={2}
            />
            <MenuList>
              <MenuItem>No new notifications</MenuItem>
            </MenuList>
          </Menu>

          {/* Settings icon */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FiSettings />}
              variant="ghost"
              aria-label="Settings"
              fontSize="lg"
              mr={2}
            />
            <MenuList>
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <Divider />
              <MenuItem icon={<FiLogOut />}>Logout</MenuItem>
            </MenuList>
          </Menu>

          {/* User profile */}
          <Menu>
            <MenuButton>
              <Avatar size="sm" name="User" bg="brand.500" color="white" />
            </MenuButton>
            <MenuList>
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <Divider />
              <MenuItem icon={<FiLogOut />}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;