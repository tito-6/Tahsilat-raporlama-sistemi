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
  Heading,
  Badge,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  VStack,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { FiBell, FiSettings, FiLogOut, FiUser, FiTrash2 } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useNotifications } from '../contexts/NotificationContext';

const Header: React.FC = () => {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { notifications, markAsRead, deleteNotification, clearAllNotifications, unreadCount } = useNotifications();
  const toast = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
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
      case '/settings':
        return 'Settings';
      default:
        return 'Innogy Tahsilat';
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear any local storage or session data
      localStorage.clear();
      sessionStorage.clear();
      
      // Show logout notification
      toast({
        title: "Logging out...",
        description: "Please wait while we sign you out.",
        status: "info",
        duration: 2000,
        isClosable: true,
      });

      // Wait a moment for the toast to show
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Since we're using HTTP Basic Auth, we need to redirect to a logout URL
      // that will challenge for new credentials
      window.location.href = '/logout';
      
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "There was an error signing you out. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoggingOut(false);
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <>
      <Box
        as="header"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={6}
        py={4}
        fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
      >
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="lg" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
            {getPageTitle()}
          </Heading>

          <Flex align="center">
            {/* Notification icon with badge */}
            <Box position="relative" mr={2}>
              <IconButton
                icon={<FiBell />}
                variant="ghost"
                aria-label="Notifications"
                fontSize="lg"
                onClick={onOpen}
              />
              {unreadCount > 0 && (
                <Badge
                  colorScheme="red"
                  borderRadius="full"
                  position="absolute"
                  top="-1"
                  right="-1"
                  fontSize="xs"
                  minW="18px"
                  h="18px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Box>

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
              <MenuList fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                <MenuItem 
                  icon={<FiUser />}
                  fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  onClick={() => router.push('/settings')}
                >
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem 
                  icon={<FiLogOut />} 
                  fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  onClick={handleLogout}
                  isDisabled={isLoggingOut}
                >
                  {isLoggingOut ? <Spinner size="sm" mr={2} /> : null}
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>

            {/* User profile */}
            <Menu>
              <MenuButton>
                <Flex align="center">
                  <Avatar size="sm" name="Innogy User" bg="blue.500" color="white" mr={2} />
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    Innogy User
                  </Text>
                </Flex>
              </MenuButton>
              <MenuList fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                <MenuItem fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold">Innogy User</Text>
                    <Text fontSize="sm" color="gray.500">innogy@tahsilat.com</Text>
                  </VStack>
                </MenuItem>
                <Divider />
                <MenuItem 
                  icon={<FiSettings />}
                  fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  onClick={() => router.push('/settings')}
                >
                  Settings
                </MenuItem>
                <MenuItem 
                  icon={<FiLogOut />} 
                  fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  onClick={handleLogout}
                  isDisabled={isLoggingOut}
                >
                  {isLoggingOut ? <Spinner size="sm" mr={2} /> : null}
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
      </Box>

      {/* Notifications Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack justify="space-between">
              <Text>Notifications</Text>
              {notifications.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FiTrash2 />}
                  onClick={clearAllNotifications}
                >
                  Clear All
                </Button>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {notifications.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                No notifications
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {notifications.map((notification) => (
                  <Alert
                    key={notification.id}
                    status={notification.type}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => handleNotificationClick(notification.id)}
                    opacity={notification.read ? 0.7 : 1}
                    border={notification.read ? "1px solid" : "2px solid"}
                    borderColor={notification.read ? "gray.200" : `${notification.type}.500`}
                  >
                    <AlertIcon />
                    <Box flex="1">
                      <AlertTitle fontSize="sm">{notification.title}</AlertTitle>
                      <AlertDescription fontSize="xs">
                        {notification.message}
                      </AlertDescription>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {formatTimeAgo(notification.timestamp)}
                      </Text>
                    </Box>
                    <CloseButton
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    />
                  </Alert>
                ))}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Header;