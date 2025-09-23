import React from 'react';
import { Box, VStack, Icon, Tooltip, Flex, Text, Divider, useColorModeValue, Select, Button, HStack, Badge } from '@chakra-ui/react';
import { FiHome, FiUpload, FiDatabase, FiBarChart2, FiSettings, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface SidebarProps {
  // Reports page specific props
  selectedYear?: number;
  selectedMonth?: number;
  selectedWeek?: number | null;
  availableYears?: number[];
  availableMonths?: number[];
  weeksInSelectedMonth?: any[];
  onYearChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onMonthChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onWeekSelect?: (weekNumber: number) => void;
  onRefreshReports?: () => void;
  isLoadingReportList?: boolean;
}

// Array of month names for dropdown (0-indexed for JavaScript Date API)
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const NavItem: React.FC<NavItemProps> = ({ icon, label, href }) => {
  const router = useRouter();
  const isActive = router.pathname === href;
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const activeColor = useColorModeValue('brand.500', 'brand.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Link href={href}>
      <Box
        display="block"
        w="full"
        py={3}
        px={4}
        rounded="md"
        transition="all 0.2s"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : undefined}
        cursor="pointer"
        fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
        _hover={{
          bg: isActive ? activeBg : hoverBg,
          textDecoration: 'none',
        }}
      >
        <Flex align="center">
          <Icon as={icon} fontSize="xl" mr={3} />
          <Text fontWeight="medium" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">{label}</Text>
        </Flex>
      </Box>
    </Link>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  selectedYear,
  selectedMonth,
  selectedWeek,
  availableYears,
  availableMonths,
  weeksInSelectedMonth,
  onYearChange,
  onMonthChange,
  onWeekSelect,
  onRefreshReports,
  isLoadingReportList
}) => {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isReportsPage = router.pathname === '/reports';
  const isMonthlySummaryPage = router.pathname === '/monthly-summary';
  const showReportControls = isReportsPage || isMonthlySummaryPage;

  return (
    <Box
      as="aside"
      w="280px"
      h="100%"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      py={6}
      overflowY="auto"
      fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
    >
      <Flex align="center" justify="center" mb={8}>
        <Text fontSize="xl" fontWeight="bold" color="brand.500" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
          Tahsilat Raporu
        </Text>
      </Flex>
      
      <VStack spacing={1} align="stretch" px={3}>
        <NavItem icon={FiHome} label="Dashboard" href="/" />
        <NavItem icon={FiUpload} label="Import Data" href="/import" />
        <NavItem icon={FiDatabase} label="Payment Data" href="/payments" />
        <NavItem icon={FiBarChart2} label="Weekly Reports" href="/reports" />
        <NavItem icon={FiCalendar} label="Monthly Summary" href="/monthly-summary" />
        <Divider my={4} />
        <NavItem icon={FiSettings} label="Settings" href="/settings" />
        
        {/* Dynamic Reports Controls */}
        {isReportsPage && (
          <>
            <Divider my={4} />
            <Box px={2}>
              <Text fontSize="sm" fontWeight="bold" mb={3} color="gray.600" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                REPORT FILTERS
              </Text>
              
              {/* Refresh Button */}
              <Button 
                colorScheme="brand" 
                size="sm"
                leftIcon={<FiRefreshCw />}
                onClick={onRefreshReports}
                isLoading={isLoadingReportList}
                mb={3}
                w="full"
                fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
              >
                Refresh Data
              </Button>

              <VStack spacing={3} align="stretch">
                {/* Year Selection */}
                <Box>
                  <Text fontSize="xs" fontWeight="medium" mb={1} color="gray.500" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                    Year:
                  </Text>
                  <Select 
                    size="sm" 
                    value={selectedYear || 2025} 
                    onChange={onYearChange}
                    bg="white"
                    fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  >
                    {availableYears?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </Box>

                {/* Month Selection */}
                <Box>
                  <Text fontSize="xs" fontWeight="medium" mb={1} color="gray.500" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                    Month:
                  </Text>
                  <Select 
                    size="sm" 
                    value={selectedMonth || 9} 
                    onChange={onMonthChange}
                    bg="white"
                    fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                  >
                    {availableMonths?.map(month => (
                      <option key={month} value={month}>
                        {MONTHS[month - 1]}
                      </option>
                    ))}
                  </Select>
                </Box>

                {/* Week Selection */}
                <Box>
                  <Text fontSize="xs" fontWeight="medium" mb={2} color="gray.500" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
                    Weeks:
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {weeksInSelectedMonth?.map(week => (
                      <Button
                        key={week.week_number}
                        size="xs"
                        variant={selectedWeek === week.week_number ? "solid" : "outline"}
                        colorScheme={selectedWeek === week.week_number ? "brand" : "gray"}
                        onClick={() => onWeekSelect?.(week.week_number)}
                        justifyContent="space-between"
                        w="full"
                        px={2}
                        fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                      >
                        <Text fontSize="xs" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">Week {week.week_number}</Text>
                        <Badge 
                          size="xs" 
                          colorScheme={week.has_data ? "green" : "gray"}
                          fontSize="9px"
                          fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                        >
                          {week.has_data ? "Data" : "Empty"}
                        </Badge>
                      </Button>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default Sidebar;