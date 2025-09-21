import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Button,
  Stack,
  useToast,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { FiDollarSign, FiCalendar, FiCreditCard, FiTrendingUp } from 'react-icons/fi';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface DailyTotal {
  date: string;
  total_tl: number;
  total_usd: number;
  payment_count: number;
}

interface DailyReportData {
  daily_reports: {
    payment_date: string;
    total_usd: number;
    transaction_count: number;
    payment_methods: string;
  }[];
  summary: {
    total_count: number;
    total_usd: number;
    unique_customers: number;
    unique_projects: number;
    average_usd_per_day: number;
  };
  top_customers: {
    customer_name: string;
    total_usd: number;
    transaction_count: number;
  }[];
}

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState<DailyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Get current date and 7 days ago for default report period
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Safe date formatting function to handle null/invalid dates
  const formatDisplayDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) {
      return 'N/A';
    }
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch daily report data for the last 7 days
        const response = await axios.get('/api/reports/daily', {
          params: {
            start_date: formatDate(sevenDaysAgo),
            end_date: formatDate(today)
          }
        });
        
        setDailyReport(response.data.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="500px">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="md" mb={4}>Error</Heading>
        <Text mb={4}>{error}</Text>
        <Button colorScheme="brand" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Dashboard header */}
      <Box mb={8}>
        <Heading size="lg" mb={2}>Welcome to Tahsilat Raporu</Heading>
        <Text color="gray.600">
          View your payment data and generate comprehensive reports
        </Text>
      </Box>

      {/* Stats cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <StatCard
          icon={FiDollarSign}
          title="Total USD (7 Days)"
          value={dailyReport?.summary.total_usd ? 
            dailyReport.summary.total_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 
            '$0.00'
          }
          helpText={`${dailyReport?.summary.total_count || 0} payments`}
          colorScheme="green"
        />
        <StatCard
          icon={FiTrendingUp}
          title="Daily Average"
          value={dailyReport?.summary.average_usd_per_day ? 
            dailyReport.summary.average_usd_per_day.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 
            '$0.00'
          }
          helpText={`Last 7 days`}
          colorScheme="blue"
        />
        <StatCard
          icon={FiCalendar}
          title="Unique Customers"
          value={dailyReport?.summary.unique_customers?.toString() || '0'}
          helpText={`${dailyReport?.summary.unique_projects || 0} projects`}
          colorScheme="purple"
        />
        <StatCard
          icon={FiCreditCard}
          title="Last Payment"
          value={dailyReport?.daily_reports && dailyReport.daily_reports.length > 0 
            ? formatDisplayDate(dailyReport.daily_reports[dailyReport.daily_reports.length - 1].payment_date)
            : 'No data'}
          helpText="Last recorded payment"
          colorScheme="orange"
        />
      </SimpleGrid>

      {/* Quick actions */}
      <Card mb={8}>
        <CardHeader pb={0}>
          <Heading size="md">Quick Actions</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Button 
              as={Link} 
              href="/import"
              colorScheme="brand" 
              variant="outline" 
              size="lg" 
              width="full"
            >
              Import Data
            </Button>
            <Button 
              as={Link} 
              href="/payments"
              colorScheme="brand" 
              variant="outline" 
              size="lg" 
              width="full"
            >
              View Payments
            </Button>
            <Button 
              as={Link} 
              href="/reports"
              colorScheme="brand" 
              variant="outline" 
              size="lg" 
              width="full"
            >
              Generate Reports
            </Button>
            <Button 
              as={Link} 
              href="/settings"
              colorScheme="brand" 
              variant="solid" 
              size="lg" 
              width="full"
            >
              Settings
            </Button>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Recent payments */}
      <Card>
        <CardHeader>
          <Heading size="md">Recent Payments</Heading>
        </CardHeader>
        <CardBody>
          {dailyReport?.daily_reports && dailyReport.daily_reports.length > 0 ? (
            <Stack spacing={4}>
              {dailyReport.daily_reports.slice(0, 5).map((day, index) => (
                <Box key={index} p={4} borderWidth="1px" borderRadius="md">
                  <Grid templateColumns="1fr 1fr 1fr" gap={4}>
                    <Box>
                      <Text fontWeight="bold">Date</Text>
                      <Text>{formatDisplayDate(day.payment_date)}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Amount (USD)</Text>
                      <Text>${day.total_usd.toFixed(2)}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Transactions</Text>
                      <Text>{day.transaction_count}</Text>
                    </Box>
                  </Grid>
                </Box>
              ))}
            </Stack>
          ) : (
            <Text>No recent payment data available.</Text>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  helpText: string;
  colorScheme: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, helpText, colorScheme }) => {
  const bgColor = `${colorScheme}.50`;
  const iconColor = `${colorScheme}.500`;

  return (
    <Card>
      <CardBody>
        <Flex justify="space-between" align="center">
          <Stat>
            <StatLabel>{title}</StatLabel>
            <StatNumber fontSize="2xl">{value}</StatNumber>
            <StatHelpText>{helpText}</StatHelpText>
          </Stat>
          <Box
            bg={bgColor}
            p={3}
            borderRadius="full"
            color={iconColor}
            fontSize="xl"
          >
            <Icon />
          </Box>
        </Flex>
      </CardBody>
    </Card>
  );
};

export default Dashboard;