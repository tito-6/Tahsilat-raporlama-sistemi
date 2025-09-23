import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Text,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Badge,
  List,
  ListItem,
  ListIcon,
  Flex,
  useToast,
  Link
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiCheck, FiX, FiAlertCircle, FiFileText } from 'react-icons/fi';
import axios from 'axios';
import { useNotifications } from '../contexts/NotificationContext';

const ImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    inserted?: number;
    errors?: string[];
  } | null>(null);
  const toast = useToast();
  const { addNotification } = useNotifications();

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Only accept the first file
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Check if the file type is acceptable
      const allowedTypes = [
        'text/csv', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'application/vnd.ms-excel',
        'application/json'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV, XLSX, or JSON file',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      setFile(selectedFile);
      setUploadResult(null); // Clear previous results
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    multiple: false
  });

  // Upload the file to the server
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the file with progress tracking
      const response = await axios.post('/api/import/excel', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      
      setUploadResult(response.data);
      
      // Show success or error toast and add to notifications
      if (response.data.success) {
        toast({
          title: 'Import successful',
          description: `Successfully imported ${response.data.inserted} payment records.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Add persistent notification
        addNotification({
          title: 'Data Import Completed',
          message: `Successfully imported ${response.data.inserted} payment records from ${file?.name}`,
          type: 'success',
          autoDelete: false
        });
      } else {
        toast({
          title: 'Import completed with errors',
          description: response.data.message,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        
        // Add persistent notification with error details
        addNotification({
          title: 'Import Completed with Issues',
          message: `${response.data.message}. ${response.data.errors?.length || 0} errors found in ${file?.name}`,
          type: 'warning',
          autoDelete: false
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Failed to upload file. Please try again.',
        errors: ['Server error occurred during file upload.']
      });
      
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Add error notification
      addNotification({
        title: 'File Upload Failed',
        message: `Failed to upload ${file?.name}. Server error occurred during file upload.`,
        type: 'error',
        autoDelete: false
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Reset the form
  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Import Payment Data</Heading>
        <NextLink href="/import-new">
          <Button colorScheme="brand" size="sm">
            Try New Import with Duplicate Detection
          </Button>
        </NextLink>
      </Flex>
      
      <Alert status="info" mb={6}>
        <AlertIcon />
        <Box>
          <AlertTitle>Enhanced Import Available</AlertTitle>
          <AlertDescription>
            We've added duplicate payment detection to help prevent duplicate records.
            Try our new import experience for better results.
          </AlertDescription>
        </Box>
      </Alert>
      
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">Upload File</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={6}>
            {/* File drop area */}
            <Box
              {...getRootProps()}
              borderWidth={2}
              borderStyle="dashed"
              borderColor={isDragActive ? "brand.400" : "gray.300"}
              borderRadius="md"
              p={10}
              bg={isDragActive ? "brand.50" : "transparent"}
              textAlign="center"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                borderColor: "brand.400",
                bg: "brand.50"
              }}
            >
              <input {...getInputProps()} />
              <Flex direction="column" align="center" justify="center">
                <Box fontSize="3xl" color="gray.400" mb={4}>
                  <FiUpload />
                </Box>
                {isDragActive ? (
                  <Text fontWeight="medium">Drop the file here...</Text>
                ) : (
                  <>
                    <Text fontWeight="medium">Drag &amp; drop a file here, or click to select</Text>
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      Supports CSV, XLSX, and JSON files
                    </Text>
                  </>
                )}
              </Flex>
            </Box>
            
            {/* Selected file info */}
            {file && (
              <Box p={4} bg="gray.50" borderRadius="md">
                <Flex align="center">
                  <Box fontSize="xl" mr={3}>
                    <FiFileText />
                  </Box>
                  <Box flex="1">
                    <Text fontWeight="medium">{file.name}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                    </Text>
                  </Box>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    Remove
                  </Button>
                </Flex>
              </Box>
            )}
            
            {/* Upload progress */}
            {isUploading && (
              <Box>
                <Text mb={2}>Uploading... {uploadProgress}%</Text>
                <Progress value={uploadProgress} size="sm" colorScheme="brand" />
              </Box>
            )}
            
            {/* Upload button */}
            <Flex justify="center">
              <Button
                colorScheme="brand"
                leftIcon={<FiUpload />}
                onClick={handleUpload}
                isLoading={isUploading}
                loadingText="Uploading..."
                isDisabled={!file || isUploading}
                size="lg"
                px={10}
              >
                Upload File
              </Button>
            </Flex>
          </Stack>
        </CardBody>
      </Card>
      
      {/* Upload results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <Heading size="md">Import Results</Heading>
          </CardHeader>
          <CardBody>
            <Alert
              status={uploadResult.success ? "success" : "error"}
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              borderRadius="md"
              p={6}
              mb={4}
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                {uploadResult.success ? "Import Successful" : "Import Completed with Errors"}
              </AlertTitle>
              <AlertDescription maxWidth="md">
                {uploadResult.message}
                {uploadResult.inserted !== undefined && (
                  <Box mt={2}>
                    <Badge colorScheme={uploadResult.success ? "green" : "orange"} fontSize="md" px={2} py={1}>
                      {uploadResult.inserted} records imported
                    </Badge>
                  </Box>
                )}
              </AlertDescription>
            </Alert>
            
            {/* Error list */}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <Box mt={6}>
                <Heading size="sm" mb={3}>Errors ({uploadResult.errors.length})</Heading>
                <List spacing={2}>
                  {uploadResult.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListIcon as={FiAlertCircle} color="red.500" />
                      {error}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Action buttons */}
            <Flex justify="center" mt={6}>
              <Button
                colorScheme="gray"
                mr={4}
                onClick={handleReset}
              >
                Import Another File
              </Button>
              
              {uploadResult.success && (
                <NextLink href="/payments">
                  <Button colorScheme="brand">View Imported Data</Button>
                </NextLink>
              )}
            </Flex>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default ImportPage;