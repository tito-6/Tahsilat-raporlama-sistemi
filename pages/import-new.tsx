import React, { useState, useCallback, useEffect } from 'react';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  HStack,
  TableContainer,
  IconButton,
  Tooltip,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useColorModeValue
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiAlertCircle, FiFileText, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import axios from 'axios';

interface DuplicatePair {
  importRow: any;
  existingPayment: any;
  similarityReasons: string[];
  importAnyway: boolean;
}

const ImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    inserted?: number;
    errors?: string[];
  } | null>(null);
  const toast = useToast();
  
  // Duplicate detection state
  const [sessionId, setSessionId] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [potentialDuplicates, setPotentialDuplicates] = useState<DuplicatePair[]>([]);
  const [nonDuplicates, setNonDuplicates] = useState<any[]>([]);
  const [duplicateCheckComplete, setDuplicateCheckComplete] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicatePair | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Reset states
    setDuplicateCheckComplete(false);
    setPotentialDuplicates([]);
    setNonDuplicates([]);
    setUploadResult(null);
    
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

  // Check for duplicates
  const checkDuplicates = async () => {
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
      
      // Upload the file and check for duplicates
      const response = await axios.post('/api/import/check-duplicates', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      
      if (response.data.success) {
        const { sessionId, filePath, potentialDuplicates, nonDuplicates } = response.data.data;
        
        setSessionId(sessionId);
        setFilePath(filePath);
        
        // Convert potential duplicates to include import flag
        const mappedDuplicates: DuplicatePair[] = potentialDuplicates.map((pair: any) => ({
          ...pair,
          importAnyway: false  // Default to not importing duplicates
        }));
        
        setPotentialDuplicates(mappedDuplicates);
        setNonDuplicates(nonDuplicates);
        setDuplicateCheckComplete(true);
        
        toast({
          title: 'File processed',
          description: `Found ${potentialDuplicates.length} potential duplicates and ${nonDuplicates.length} new records.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Processing failed',
          description: response.data.message || 'Failed to process file',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // View duplicate details
  const viewDuplicateDetails = (duplicate: DuplicatePair) => {
    setSelectedDuplicate(duplicate);
    onOpen();
  };
  
  // Toggle import flag for a duplicate
  const toggleDuplicateImport = (index: number) => {
    const updatedDuplicates = [...potentialDuplicates];
    updatedDuplicates[index].importAnyway = !updatedDuplicates[index].importAnyway;
    setPotentialDuplicates(updatedDuplicates);
  };
  
  // Toggle import flag for all duplicates
  const toggleAllDuplicates = (value: boolean) => {
    const updatedDuplicates = potentialDuplicates.map(dup => ({
      ...dup,
      importAnyway: value
    }));
    setPotentialDuplicates(updatedDuplicates);
  };
  
  // Confirm import
  const confirmImport = async () => {
    try {
      setIsImporting(true);
      
      // Prepare data for import
      const rowsToImport = [
        ...nonDuplicates,
        ...potentialDuplicates
          .filter(dup => dup.importAnyway)
          .map(dup => ({
            ...dup.importRow,
            _isDuplicateConfirmed: true  // Mark as a confirmed duplicate
          }))
      ];
      
      // If there's nothing to import, show error
      if (rowsToImport.length === 0) {
        toast({
          title: 'No records selected',
          description: 'Please select at least one record to import or include non-duplicates',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setIsImporting(false);
        return;
      }
      
      // Import the data
      const response = await axios.post('/api/import/confirm-import', {
        sessionId,
        filePath,
        rowsToImport
      });
      
      setUploadResult(response.data);
      
      // Reset duplicate detection state
      setDuplicateCheckComplete(false);
      setPotentialDuplicates([]);
      setNonDuplicates([]);
      
      if (response.data.success) {
        toast({
          title: 'Import successful',
          description: `Successfully imported ${response.data.inserted} payment records.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Import completed with errors',
          description: response.data.message,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setUploadResult({
        success: false,
        message: 'Failed to import data. Please try again.',
        errors: ['Server error occurred during import.']
      });
      
      toast({
        title: 'Import failed',
        description: 'Failed to import data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Reset the form
  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setDuplicateCheckComplete(false);
    setPotentialDuplicates([]);
    setNonDuplicates([]);
    setSessionId('');
    setFilePath('');
  };
  
  // Duplicate details modal
  const DuplicateDetailsModal = () => {
    if (!selectedDuplicate) return null;
    
    const importRow = selectedDuplicate.importRow;
    const existingPayment = selectedDuplicate.existingPayment;
    
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Duplicate Payment Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle mb={2}>Potential Duplicate Payment</AlertTitle>
                <AlertDescription>
                  <List spacing={1}>
                    {selectedDuplicate.similarityReasons.map((reason, i) => (
                      <ListItem key={i}>
                        <ListIcon as={FiAlertCircle} color="orange.400" />
                        {reason}
                      </ListItem>
                    ))}
                  </List>
                </AlertDescription>
              </Box>
            </Alert>
            
            <Tabs isFitted variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>New Payment (Import)</Tab>
                <Tab>Existing Payment (Database)</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <TableContainer>
                    <Table size="sm" variant="simple">
                      <Tbody>
                        <Tr>
                          <Th>Customer</Th>
                          <Td>{importRow['Müşteri Adı Soyadı']}</Td>
                        </Tr>
                        <Tr>
                          <Th>Date</Th>
                          <Td>{importRow['Tarih']}</Td>
                        </Tr>
                        <Tr>
                          <Th>Amount</Th>
                          <Td>{importRow['Ödenen Tutar(Σ:12,438,088.23)']}</Td>
                        </Tr>
                        <Tr>
                          <Th>Currency</Th>
                          <Td>{importRow['Ödenen Döviz'] || 'TRY'}</Td>
                        </Tr>
                        <Tr>
                          <Th>Payment Method</Th>
                          <Td>{importRow['Tahsilat Şekli']}</Td>
                        </Tr>
                        <Tr>
                          <Th>Project</Th>
                          <Td>{importRow['Proje Adı'] || '-'}</Td>
                        </Tr>
                        <Tr>
                          <Th>Description</Th>
                          <Td>{importRow['Açıklama'] || '-'}</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>
                <TabPanel>
                  <TableContainer>
                    <Table size="sm" variant="simple">
                      <Tbody>
                        <Tr>
                          <Th>Customer</Th>
                          <Td>{existingPayment.customer_name}</Td>
                        </Tr>
                        <Tr>
                          <Th>Date</Th>
                          <Td>{existingPayment.payment_date}</Td>
                        </Tr>
                        <Tr>
                          <Th>Amount</Th>
                          <Td>{existingPayment.amount_paid}</Td>
                        </Tr>
                        <Tr>
                          <Th>Currency</Th>
                          <Td>{existingPayment.currency_paid}</Td>
                        </Tr>
                        <Tr>
                          <Th>Payment Method</Th>
                          <Td>{existingPayment.payment_method}</Td>
                        </Tr>
                        <Tr>
                          <Th>Project</Th>
                          <Td>{existingPayment.project_name || '-'}</Td>
                        </Tr>
                        <Tr>
                          <Th>Description</Th>
                          <Td>{existingPayment.description || '-'}</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>Import Payment Data</Heading>
      
      {!duplicateCheckComplete && !uploadResult && (
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
                  <Text mb={2}>Processing file... {uploadProgress}%</Text>
                  <Progress value={uploadProgress} size="sm" colorScheme="brand" />
                </Box>
              )}
              
              {/* Upload button */}
              <Flex justify="center">
                <Button
                  colorScheme="brand"
                  leftIcon={<FiUpload />}
                  onClick={checkDuplicates}
                  isLoading={isUploading}
                  loadingText="Processing..."
                  isDisabled={!file || isUploading}
                  size="lg"
                  px={10}
                >
                  Check & Upload File
                </Button>
              </Flex>
            </Stack>
          </CardBody>
        </Card>
      )}
      
      {/* Duplicate detection UI */}
      {duplicateCheckComplete && !uploadResult && (
        <Card mb={6}>
          <CardHeader>
            <Heading size="md">Import Review</Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={6}>
              <HStack>
                <Box flex="1">
                  <Heading size="sm" mb={1}>Data Summary</Heading>
                  <HStack spacing={4} mt={2}>
                    <Badge colorScheme="green" px={2} py={1} borderRadius="md">
                      {nonDuplicates.length} New Records
                    </Badge>
                    <Badge colorScheme="orange" px={2} py={1} borderRadius="md">
                      {potentialDuplicates.length} Potential Duplicates
                    </Badge>
                  </HStack>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                >
                  Change File
                </Button>
              </HStack>
              
              {potentialDuplicates.length > 0 && (
                <>
                  <Alert status="info" variant="left-accent" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Potential duplicate payments found</AlertTitle>
                      <AlertDescription>
                        Please review the duplicates and select which ones to import anyway.
                      </AlertDescription>
                    </Box>
                  </Alert>
                  
                  <Box>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Heading size="sm">Potential Duplicates</Heading>
                      <HStack>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => toggleAllDuplicates(true)}
                        >
                          Select All
                        </Button>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => toggleAllDuplicates(false)}
                        >
                          Deselect All
                        </Button>
                      </HStack>
                    </Flex>
                    
                    <TableContainer>
                      <Table size="sm" variant="simple" colorScheme="gray">
                        <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                          <Tr>
                            <Th px={2} width="40px">Import</Th>
                            <Th>Customer</Th>
                            <Th>Date</Th>
                            <Th isNumeric>Amount</Th>
                            <Th>Currency</Th>
                            <Th>Similarity</Th>
                            <Th width="40px">Details</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {potentialDuplicates.map((duplicate, index) => (
                            <Tr key={index}>
                              <Td px={2}>
                                <Checkbox
                                  isChecked={duplicate.importAnyway}
                                  onChange={() => toggleDuplicateImport(index)}
                                  colorScheme="brand"
                                />
                              </Td>
                              <Td>{duplicate.importRow['Müşteri Adı Soyadı']}</Td>
                              <Td>{duplicate.importRow['Tarih']}</Td>
                              <Td isNumeric>{duplicate.importRow['Ödenen Tutar(Σ:12,438,088.23)']}</Td>
                              <Td>{duplicate.importRow['Ödenen Döviz'] || 'TRY'}</Td>
                              <Td>
                                <HStack>
                                  <Badge colorScheme="orange">
                                    {duplicate.similarityReasons.length} matches
                                  </Badge>
                                </HStack>
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label="View details"
                                  icon={<FiInfo />}
                                  size="xs"
                                  onClick={() => viewDuplicateDetails(duplicate)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                </>
              )}
              
              {/* Non-duplicates summary */}
              <Box>
                <Heading size="sm" mb={2}>New Records</Heading>
                <Alert status="success" variant="left-accent" borderRadius="md">
                  <AlertIcon />
                  {nonDuplicates.length} new payment records will be imported.
                </Alert>
              </Box>
              
              {/* Import actions */}
              <Flex justify="center" mt={4}>
                <Button
                  colorScheme="red"
                  variant="outline"
                  mr={4}
                  onClick={handleReset}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={confirmImport}
                  isLoading={isImporting}
                  loadingText="Importing..."
                  leftIcon={<FiCheckCircle />}
                >
                  Confirm Import ({nonDuplicates.length + potentialDuplicates.filter(d => d.importAnyway).length} records)
                </Button>
              </Flex>
            </Stack>
          </CardBody>
        </Card>
      )}
      
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
                <Button
                  colorScheme="brand"
                  as="a"
                  href="/payments"
                >
                  View Imported Data
                </Button>
              )}
            </Flex>
          </CardBody>
        </Card>
      )}
      
      {/* Duplicate details modal */}
      <DuplicateDetailsModal />
    </Box>
  );
};

export default ImportPage;