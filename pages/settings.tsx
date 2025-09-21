import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  StatHelpText,
  Switch,
  Text,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Alert,
  AlertIcon
} from '@chakra-ui/react';

// Safe date formatting function for file timestamps
function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
}

function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '';
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString();
  } catch (error) {
    return '';
  }
}

interface DatabaseInfo {
  databasePath: string;
  exists: boolean;
  sizeBytes: number;
  sizeMb: number;
  lastModified: string;
}

const SettingsPage = () => {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  useEffect(() => {
    // Load settings from localStorage or API
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    
    // Fetch database path info from API
    fetchDatabaseInfo();
  }, []);
  
  const fetchDatabaseInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/database-info');
      const data = await response.json();
      setDatabaseInfo(data);
    } catch (error) {
      console.error('Error fetching database info:', error);
      toast({
        title: 'Error fetching database info',
        description: 'Could not retrieve database information',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDarkModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isDark = e.target.checked;
    setDarkMode(isDark);
    localStorage.setItem('darkMode', isDark.toString());
    
    // Apply dark mode to the entire app
    document.documentElement.classList.toggle('dark-theme', isDark);
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      // Call the delete API endpoint
      const response = await fetch('/api/settings/delete-all-data', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete data');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Data deleted successfully',
        description: 'All payment data, cache, and storage have been cleared. You can start fresh.',
        status: 'success',
        duration: 8000,
        isClosable: true,
      });
      
      // Refresh database info after deletion
      await fetchDatabaseInfo();
      
      // Close dialog
      onClose();
      
      // Optional: Clear local storage as well
      localStorage.clear();
      
    } catch (error) {
      console.error('Error deleting all data:', error);
      
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting the data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      // Call the backup API endpoint
      const response = await fetch('/api/settings/backup-database', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      toast({
        title: 'Backup successful',
        description: `Database backup saved to: ${data.backupPath}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh database info after backup
      fetchDatabaseInfo();
    } catch (error) {
      console.error('Error backing up database:', error);
      
      toast({
        title: 'Backup failed',
        description: 'There was an error creating the database backup',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>Settings</Heading>
      
      <Stack spacing={8}>
        {/* Application Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Application Settings</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="dark-mode" mb="0">
                  Dark Mode
                </FormLabel>
                <Switch
                  id="dark-mode"
                  isChecked={darkMode}
                  onChange={handleDarkModeToggle}
                  colorScheme="brand"
                />
              </FormControl>
            </Stack>
          </CardBody>
        </Card>
        
        {/* Database Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Database Settings</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Database Path</FormLabel>
                <Input value={databaseInfo?.databasePath || 'Loading...'} isReadOnly />
              </FormControl>
              
              {databaseInfo && (
                <StatGroup mt={4}>
                  <Stat>
                    <StatLabel>Size</StatLabel>
                    <StatNumber>{databaseInfo.sizeMb} MB</StatNumber>
                    <StatHelpText>{databaseInfo.sizeBytes} bytes</StatHelpText>
                  </Stat>
                  
                  <Stat>
                    <StatLabel>Last Modified</StatLabel>
                    <StatNumber>
                      {formatTimestamp(databaseInfo.lastModified)}
                    </StatNumber>
                    <StatHelpText>
                      {formatTime(databaseInfo.lastModified)}
                    </StatHelpText>
                  </Stat>
                </StatGroup>
              )}
              
              <Divider my={4} />
              
              <Box>
                <Button
                  colorScheme="brand"
                  isLoading={isBackingUp}
                  onClick={handleBackupDatabase}
                  mr={3}
                >
                  Create Database Backup
                </Button>
                <Button
                  onClick={fetchDatabaseInfo}
                  isLoading={isLoading}
                  mr={3}
                >
                  Refresh Info
                </Button>
                <Button
                  colorScheme="green"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/database/test-connection');
                      const data = await response.json();
                      
                      toast({
                        title: 'Connection Test',
                        description: `${data.message} (SQLite v${data.sqlite_version})`,
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                      });
                    } catch (error) {
                      console.error('Connection test failed:', error);
                      toast({
                        title: 'Connection Test Failed',
                        description: 'Could not connect to database',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                      });
                    }
                  }}
                >
                  Test Connection
                </Button>
              </Box>
            </Stack>
          </CardBody>
        </Card>
        
        {/* Danger Zone */}
        <Card borderColor="red.200" borderWidth="2px">
          <CardHeader bg="red.50">
            <Heading size="md" color="red.600">Danger Zone</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <Alert status="warning">
                <AlertIcon />
                These actions are permanent and cannot be undone!
              </Alert>
              
              <Box p={4} borderWidth="1px" borderColor="red.200" borderRadius="md" bg="red.25">
                <Text fontWeight="bold" mb={2} color="red.700">Delete All Data</Text>
                <Text fontSize="sm" color="red.600" mb={4}>
                  This will permanently delete all payment data, cached reports, and clear the database. 
                  This action cannot be undone. Consider creating a backup first.
                </Text>
                <Button
                  colorScheme="red"
                  onClick={onOpen}
                  size="sm"
                  variant="outline"
                >
                  Delete All Data
                </Button>
              </Box>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
      
      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete All Data
            </AlertDialogHeader>

            <AlertDialogBody>
              <Stack spacing={3}>
                <Text>
                  Are you absolutely sure you want to delete all data? This action will:
                </Text>
                <Box as="ul" pl={4}>
                  <Text as="li">• Delete all payment records from the database</Text>
                  <Text as="li">• Clear all cached reports and data</Text>
                  <Text as="li">• Reset the application to initial state</Text>
                  <Text as="li">• Clear browser storage and cache</Text>
                </Box>
                <Alert status="error" mt={3}>
                  <AlertIcon />
                  <Text fontSize="sm">
                    <strong>This action cannot be undone.</strong> Consider creating a backup first.
                  </Text>
                </Alert>
              </Stack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteAllData}
                isLoading={isDeleting}
                loadingText="Deleting..."
                ml={3}
              >
                Delete All Data
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SettingsPage;