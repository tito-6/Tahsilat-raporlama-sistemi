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

interface PaymentsResponse {
  success: boolean;
  data: {
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total_records: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    filters: {
      payment_methods: string[];
      currencies: string[];
      projects: string[];
      customers: string[];
    };
  };
}

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    payment_methods: [],
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
  const [pagination, setPagination] = useState({
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
  }, [pagination.page, pagination.limit, sorting, filters]);

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
          description: `Exported ${response.data.data.payments.length} payment records.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export payment data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

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
      'Exchange Rate Date',
      'Method',
      'Year',
      'Month',
      'Note'
    ];
    
    const rows = data.map(payment => [
      payment.id,
      payment.payment_date,
      payment.customer_name,
      payment.project_name,
      payment.amount_paid,
      payment.currency_paid,
      payment.amount_usd.toFixed(2),
      payment.exchange_rate,
      payment.exchange_rate_date || payment.payment_date,
      payment.payment_method,
      payment.year,
      payment.month,
      payment.note || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => typeof field === 'string' ? `"${field.replace(/"/g, '""')}"` : field).join(',')
    ).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (column: string) => {
    setSorting(prev => ({
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === 'DESC' ? 'ASC' : 'DESC'
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

  // Calculate summary statistics
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount_usd, 0);
  const avgAmount = payments.length > 0 ? totalAmount / payments.length : 0;

  // Check if any rows are selected
  const hasSelectedRows = Object.values(selectedRows).some(selected => selected);

  if (isLoading && payments.length === 0) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      <Heading mb={6}>Payment Records</Heading>
      
      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Stat>
          <StatLabel>Total Records</StatLabel>
          <StatNumber>{pagination.total_records.toLocaleString()}</StatNumber>
          <StatHelpText>Payment records</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Page Total (USD)</StatLabel>
          <StatNumber>${totalAmount.toFixed(2)}</StatNumber>
          <StatHelpText>Current page sum</StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Average Amount</StatLabel>
          <StatNumber>${avgAmount.toFixed(2)}</StatNumber>
          <StatHelpText>Per payment</StatHelpText>
        </Stat>
        <Stat>
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

      {/* Advanced Filters */}
      <Card mb={6}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Advanced Filters</Heading>
            <HStack>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={clearFilters}
                leftIcon={<FiRefreshCw />}
              >
                Clear
              </Button>
              <Button 
                size="sm" 
                colorScheme="brand" 
                onClick={applyFilters}
                leftIcon={<FiFilter />}
              >
                Apply Filters
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            {/* Search and Date Range */}
            <HStack spacing={4} width="full">
              <InputGroup flex={2}>
                <InputLeftElement pointerEvents="none">
                  <FiSearch color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search customers, projects, or notes..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </InputGroup>
              
              <Input
                placeholder="Start Date"
                type="date"
                flex={1}
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />
              
              <Input
                placeholder="End Date"
                type="date"
                flex={1}
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </HStack>

            {/* Filter Dropdowns */}
            <HStack spacing={4} width="full">
              <Select
                placeholder="All Payment Methods"
                flex={1}
                value={filters.payment_method}
                onChange={(e) => setFilters(prev => ({ ...prev, payment_method: e.target.value }))}
              >
                {filterOptions.payment_methods.map(method => (
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
                isLoading={isLoading}
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
            <>
              <Tabs isLazy variant="enclosed">
                <TabList mb="1em">
                  <Tab>Standard View</Tab>
                  <Tab>Converted Payments Only</Tab>
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
                                          {payment.note && <Text>Note: {payment.note}</Text>}
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
                          {payments
                            .filter(payment => payment.currency_paid !== 'USD') // Only show non-USD payments that were converted
                            .length === 0 ? (
                            <Tr>
                              <Td colSpan={7} textAlign="center" py={8}>
                                <Alert status="info" variant="subtle">
                                  <AlertIcon />
                                  <Box>
                                    <Text fontWeight="medium">No currency conversions found</Text>
                                    <Text fontSize="sm" color="gray.600">
                                      This tab shows only payments that were converted from other currencies (TL, EUR) to USD. 
                                      All current payments are already in USD.
                                    </Text>
                                  </Box>
                                </Alert>
                              </Td>
                            </Tr>
                          ) : (
                            payments
                              .filter(payment => payment.currency_paid !== 'USD') // Only show non-USD payments that were converted
                              .map((payment) => (
                              <Tr key={payment.id} _hover={{ bg: "gray.50" }}>
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
                                    {payment.currency_paid === 'TRY' || payment.currency_paid === 'TL' ? '₺' : 
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
                                  <Text fontWeight="medium">
                                    {payment.exchange_rate.toFixed(4)}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text>{formatDate(payment.exchange_rate_date || payment.payment_date)}</Text>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              {/* Pagination */}
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
            </>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default PaymentsPage;