import React, { useState, useEffect } from 'react';
import { formatDate } from '../lib/utils/dateFormatter';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Card,
  CardBody,
  CardHeader,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  HStack,
  VStack,
  Button,
  IconButton,
  useToast,
  NumberInput,
  NumberInputField,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiDownload, 
  FiFilter, 
  FiRefreshCw, 
  FiChevronLeft, 
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEye,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiMoreVertical
} from 'react-icons/fi';
import axios from 'axios';

interface Payment {
  id: number;
  payment_date: string;
  customer_name: string;
  project_name: string;
  amount_paid: number;
  currency_paid: string;
  payment_method: string;
  note?: string;
  department?: string;
  exchange_rate: number;
  exchange_rate_date?: string;
  amount_usd: number;
  year: number;
  month: number;
}

interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface FilterOptions {
  paymentMethods: string[];
  currencies: string[];
  projects: string[];
  customers: string[];
}

interface PaymentsResponse {
  success: boolean;
  data: {
    payments: Payment[];
    pagination: Pagination;
    filters: FilterOptions;
  };
  message?: string;
}

// Helper function to convert payments to CSV format
const convertToCSV = (data: Payment[]): string => {
  const headers = [
    'ID',
    'Date',
    'Customer',
    'Project',
    'Amount',
    'Currency',
    'USD Amount',
    'Exchange Rate',
    'Method',
    'Year',
    'Month'
  ];
  
  const rows = data.map(payment => [
    payment.id,
    payment.payment_date,
    payment.customer_name,
    payment.project_name,
    payment.amount_paid,
    payment.currency_paid,
    payment.amount_usd,
    payment.exchange_rate,
    payment.payment_method,
    payment.year,
    payment.month
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))
    .join('\\n');
};

// Helper function to download data as a CSV file
const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const PaymentsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    paymentMethods: [],
    currencies: [],
    projects: [],
    customers: []
  });
  
  // Expanded row state
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});
  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>({});
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    payment_method: '',
    currency: '',
    project: '',
    customer: '',
    start_date: '',
    end_date: ''
  });

  // Pagination states
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // Sorting states
  const [sorting, setSorting] = useState({
    sort_by: 'payment_date',
    sort_order: 'DESC'
  });

  const toast = useToast();

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, pagination.limit, sorting]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        ...sorting
      };

      const response = await axios.get<PaymentsResponse>('/api/payments', { params });
      
      if (response.data.success) {
        setPayments(response.data.data.payments);
        setPagination(response.data.data.pagination);
        setFilterOptions(response.data.data.filters);
      } else {
        throw new Error('Failed to fetch payments');
      }
      
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments data.');
      toast({
        title: 'Error',
        description: 'Failed to load payments data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPayments();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      payment_method: '',
      currency: '',
      project: '',
      customer: '',
      start_date: '',
      end_date: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const exportPayments = async () => {
    try {
      const params = {
        ...filters,
        limit: 10000, // Export all matching records
        page: 1
      };
      
      const response = await axios.get('/api/payments', { params });
      
      if (response.data.success) {
        const csvContent = convertToCSV(response.data.data.payments);
        downloadCSV(csvContent, `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
        
        toast({
          title: 'Export Successful',
          description: `${response.data.data.payments.length} payment records exported to CSV.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error('Error exporting payments:', err);
      toast({
        title: 'Export Failed',
        description: 'Could not export payment data to CSV.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSort = (column: string) => {
    setSorting(prev => ({
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === 'ASC' ? 'DESC' : 'ASC'
    }));
  };

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAllRows = (selected: boolean) => {
    const newSelection: { [key: number]: boolean } = {};
    payments.forEach(payment => {
      newSelection[payment.id] = selected;
    });
    setSelectedRows(newSelection);
  };

  // Check if any rows are selected
  const hasSelectedRows = Object.values(selectedRows).some(selected => selected);

  return (
    <Box p={6}>
      <Heading mb={4}>Payment Records</Heading>

      {isLoading && (
        <Flex justify="center" align="center" py={10}>
          <Spinner size="xl" thickness="4px" color="blue.500" />
        </Flex>
      )}

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Payment Summary Stats */}
      {!isLoading && !error && payments.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
          <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Total Payments</StatLabel>
            <StatNumber>{pagination.total_records}</StatNumber>
            <StatHelpText>Records in database</StatHelpText>
          </Stat>
          
          <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Total USD Amount</StatLabel>
            <StatNumber>
              ${payments.reduce((sum, payment) => sum + payment.amount_usd, 0).toLocaleString(undefined, { 
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              })}
            </StatNumber>
            <StatHelpText>Current selection</StatHelpText>
          </Stat>
          
          <Stat p={4} shadow="md" border="1px" borderColor="gray.200" borderRadius="md">
            <StatLabel>Currency Breakdown</StatLabel>
            <StatNumber>
              {Object.entries(
                payments.reduce((acc, payment) => {
                  if (!acc[payment.currency_paid]) acc[payment.currency_paid] = 0;
                  acc[payment.currency_paid]++;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([currency, count]) => (
                <Badge key={currency} colorScheme="blue" mr={2}>
                  {currency}: {count}
                </Badge>
              ))}
            </StatNumber>
            <StatHelpText>By currency type</StatHelpText>
          </Stat>
        </SimpleGrid>
      )}

      {/* Filters Card */}
      <Card mb={4}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Search and Filter</Heading>
            <HStack>
              <Button size="sm" colorScheme="blue" leftIcon={<FiFilter />} onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input 
                placeholder="Search by keyword..." 
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </InputGroup>
            
            <Accordion allowToggle>
              <AccordionItem>
                <h2>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      Advanced Filters
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <HStack spacing={4} mb={4}>
                    <Select
                      placeholder="All Payment Methods"
                      flex={1}
                      value={filters.payment_method}
                      onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
                    >
                      {filterOptions.paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </Select>
                    
                    <Select
                      placeholder="All Currencies"
                      flex={1}
                      value={filters.currency}
                      onChange={(e) => setFilters(prev => ({ ...prev, currency: e.target.value }))}
                    >
                      {filterOptions.currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </Select>
                  </HStack>
                  
                  <HStack spacing={4} mb={4}>
                    <Input
                      type="date"
                      flex={1}
                      value={filters.start_date}
                      onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                      placeholder="Start Date"
                    />
                    
                    <Input
                      type="date"
                      flex={1}
                      value={filters.end_date}
                      onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                      placeholder="End Date"
                    />
                  </HStack>
                  
                  <HStack spacing={4}>
                    <Select
                      placeholder="All Projects"
                      flex={1}
                      value={filters.project}
                      onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
                    >
                      {filterOptions.projects.map(project => (
                        <option key={project} value={project}>{project}</option>
                      ))}
                    </Select>
                    
                    <Select
                      placeholder="All Customers"
                      flex={1}
                      value={filters.customer}
                      onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                    >
                      {filterOptions.customers.map(customer => (
                        <option key={customer} value={customer}>{customer}</option>
                      ))}
                    </Select>
                  </HStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </CardBody>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Payment Records</Heading>
            <HStack>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<FiDownload />}
                onClick={exportPayments}
              >
                Export CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FiRefreshCw />}
                onClick={fetchPayments}
              >
                Refresh
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          {payments.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              No payments found with current filters. Try adjusting your search criteria or import data to see payment records.
            </Alert>
          ) : (
            <Tabs isLazy variant="enclosed">
              <TabList mb="1em">
                <Tab>Standard View</Tab>
                <Tab>USD Conversion View</Tab>
              </TabList>
              
              <TabPanels>
                {/* Standard View Tab */}
                <TabPanel>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th width="40px">
                            <Checkbox
                              isChecked={
                                payments.length > 0 &&
                                payments.every(payment => selectedRows[payment.id])
                              }
                              onChange={(e) => selectAllRows(e.target.checked)}
                            />
                          </Th>
                          <Th width="40px"></Th>
                          <Th cursor="pointer" onClick={() => handleSort('payment_date')}>
                            Date {sorting.sort_by === 'payment_date' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th cursor="pointer" onClick={() => handleSort('customer_name')}>
                            Customer {sorting.sort_by === 'customer_name' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th cursor="pointer" onClick={() => handleSort('project_name')}>
                            Project {sorting.sort_by === 'project_name' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th cursor="pointer" onClick={() => handleSort('amount_paid')}>
                            Amount {sorting.sort_by === 'amount_paid' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th>USD Amount</Th>
                          <Th cursor="pointer" onClick={() => handleSort('payment_method')}>
                            Method {sorting.sort_by === 'payment_method' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {payments.map((payment) => (
                          <React.Fragment key={payment.id}>
                            <Tr 
                              bg={selectedRows[payment.id] ? "blue.50" : undefined}
                              _hover={{ bg: "gray.50" }}
                            >
                              <Td>
                                <Checkbox 
                                  isChecked={selectedRows[payment.id] || false}
                                  onChange={() => toggleRowSelection(payment.id)}
                                />
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label={expandedRows[payment.id] ? "Collapse row" : "Expand row"}
                                  icon={expandedRows[payment.id] ? <FiChevronUp /> : <FiChevronDown />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => toggleRowExpansion(payment.id)}
                                />
                              </Td>
                              <Td>{formatDate(payment.payment_date)}</Td>
                              <Td>
                                <Text fontWeight="medium">{payment.customer_name}</Text>
                              </Td>
                              <Td>
                                <Badge colorScheme="purple" variant="subtle">
                                  {payment.project_name}
                                </Badge>
                              </Td>
                              <Td>
                                <Text fontWeight="bold">
                                  {payment.currency_paid === 'TRY' ? '₺' : 
                                   payment.currency_paid === 'USD' ? '$' : 
                                   payment.currency_paid === 'EUR' ? '€' : ''}
                                  {payment.amount_paid.toLocaleString()}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {payment.currency_paid}
                                </Text>
                              </Td>
                              <Td>
                                <Text fontWeight="semibold" color="green.600">
                                  ${payment.amount_usd.toFixed(2)}
                                </Text>
                                {payment.currency_paid !== 'USD' && (
                                  <Text fontSize="xs" color="gray.500">
                                    Rate: {payment.exchange_rate}
                                  </Text>
                                )}
                              </Td>
                              <Td>
                                <Badge colorScheme="blue" variant="subtle">
                                  {payment.payment_method}
                                </Badge>
                              </Td>
                            </Tr>
                            {expandedRows[payment.id] && (
                              <Tr bg="gray.50">
                                <Td colSpan={8}>
                                  <Box p={4}>
                                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                                      <Box>
                                        <Text fontWeight="bold">Payment Details</Text>
                                        <Text>ID: {payment.id}</Text>
                                        <Text>Year: {payment.year}</Text>
                                        <Text>Month: {payment.month}</Text>
                                      </Box>
                                      <Box>
                                        <Text fontWeight="bold">Currency Information</Text>
                                        <Text>Original Amount: {payment.currency_paid} {payment.amount_paid.toLocaleString()}</Text>
                                        <Text>USD Equivalent: ${payment.amount_usd.toFixed(2)}</Text>
                                        <Text>Exchange Rate: {payment.exchange_rate}</Text>
                                        <Text>Rate Date: {formatDate(payment.exchange_rate_date || payment.payment_date)}</Text>
                                      </Box>
                                      <Box>
                                        <Text fontWeight="bold">Actions</Text>
                                        <HStack mt={2}>
                                          <Button size="sm" leftIcon={<FiEye />} colorScheme="blue" variant="outline">
                                            View Details
                                          </Button>
                                          <Menu>
                                            <MenuButton as={Button} rightIcon={<FiMoreVertical />} size="sm" variant="ghost">
                                              More
                                            </MenuButton>
                                            <MenuList>
                                              <MenuItem>Export Single Record</MenuItem>
                                              <MenuItem>Print Receipt</MenuItem>
                                            </MenuList>
                                          </Menu>
                                        </HStack>
                                      </Box>
                                    </SimpleGrid>
                                  </Box>
                                </Td>
                              </Tr>
                            )}
                          </React.Fragment>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>
                
                {/* USD Conversion View Tab */}
                <TabPanel>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th cursor="pointer" onClick={() => handleSort('payment_date')}>
                            Payment Date {sorting.sort_by === 'payment_date' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th cursor="pointer" onClick={() => handleSort('customer_name')}>
                            Customer {sorting.sort_by === 'customer_name' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th cursor="pointer" onClick={() => handleSort('project_name')}>
                            Project {sorting.sort_by === 'project_name' && (sorting.sort_order === 'DESC' ? '↓' : '↑')}
                          </Th>
                          <Th>Original Amount</Th>
                          <Th>USD Equivalent</Th>
                          <Th>Exchange Rate</Th>
                          <Th>Exchange Rate Date</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {payments.map((payment) => (
                          <Tr key={payment.id}>
                            <Td>{formatDate(payment.payment_date)}</Td>
                            <Td>
                              <Text fontWeight="medium">{payment.customer_name}</Text>
                            </Td>
                            <Td>
                              <Badge colorScheme="purple" variant="subtle">
                                {payment.project_name}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontWeight="bold">
                                {payment.currency_paid === 'TRY' ? '₺' : 
                                 payment.currency_paid === 'USD' ? '$' : 
                                 payment.currency_paid === 'EUR' ? '€' : ''}
                                {payment.amount_paid.toLocaleString()}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {payment.currency_paid}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontWeight="semibold" color="green.600">
                                ${payment.amount_usd.toFixed(2)}
                              </Text>
                            </Td>
                            <Td>
                              {payment.currency_paid !== 'USD' ? (
                                <Text fontWeight="medium">
                                  {payment.exchange_rate.toFixed(4)}
                                </Text>
                              ) : (
                                <Text color="gray.500">-</Text>
                              )}
                            </Td>
                            <Td>
                              {payment.currency_paid !== 'USD' ? (
                                <Text>{formatDate(payment.exchange_rate_date || payment.payment_date)}</Text>
                              ) : (
                                <Text color="gray.500">-</Text>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Pagination */}
            {payments.length > 0 && (
              <Flex justify="space-between" align="center" mt={4}>
                <Text fontSize="sm" color="gray.600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total_records)} of{' '}
                  {pagination.total_records} results
                </Text>
                
                <HStack>
                  <IconButton
                    aria-label="First page"
                    icon={<FiChevronsLeft />}
                    size="sm"
                    isDisabled={!pagination.has_prev}
                    onClick={() => goToPage(1)}
                  />
                  <IconButton
                    aria-label="Previous page"
                    icon={<FiChevronLeft />}
                    size="sm"
                    isDisabled={!pagination.has_prev}
                    onClick={() => goToPage(pagination.page - 1)}
                  />
                  
                  <Text fontSize="sm" mx={2}>
                    Page {pagination.page} of {pagination.total_pages}
                  </Text>
                  
                  <IconButton
                    aria-label="Next page"
                    icon={<FiChevronRight />}
                    size="sm"
                    isDisabled={!pagination.has_next}
                    onClick={() => goToPage(pagination.page + 1)}
                  />
                  <IconButton
                    aria-label="Last page"
                    icon={<FiChevronsRight />}
                    size="sm"
                    isDisabled={!pagination.has_next}
                    onClick={() => goToPage(pagination.total_pages)}
                  />
                </HStack>
              </Flex>
            )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default PaymentsPage;