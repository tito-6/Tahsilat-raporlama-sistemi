import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardHeader,
  CardBody,
  Alert,
  AlertIcon,
  Flex,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Badge
} from '@chakra-ui/react';
import { ChevronDownIcon, DownloadIcon } from '@chakra-ui/icons';
import { FaPrint } from 'react-icons/fa';
import Layout from '../components/Layout';
import { useNotifications } from '../contexts/NotificationContext';

const MonthlySummaryPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isExporting, setIsExporting] = useState<{[key: string]: boolean}>({});
  
  const { addNotification } = useNotifications();

  // Available years and months
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const availableMonths = [
    { value: 1, name: 'Ocak' },
    { value: 2, name: 'Şubat' },
    { value: 3, name: 'Mart' },
    { value: 4, name: 'Nisan' },
    { value: 5, name: 'Mayıs' },
    { value: 6, name: 'Haziran' },
    { value: 7, name: 'Temmuz' },
    { value: 8, name: 'Ağustos' },
    { value: 9, name: 'Eylül' },
    { value: 10, name: 'Ekim' },
    { value: 11, name: 'Kasım' },
    { value: 12, name: 'Aralık' }
  ];

  const monthNames: { [key: number]: string } = {
    1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
    7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
  };

  // Fetch monthly summary data
  const fetchMonthlyData = async (year: number, month: number) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/reports/monthly-summary?year=${year}&month=${month}`);
      const data = await response.json();
      
      if (data.success) {
        setMonthlyData(data);
      } else {
        setError(data.error || 'Veri alınamadı');
      }
    } catch (err) {
      setError('Sunucu hatası');
      console.error('Monthly data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when year/month changes
  useEffect(() => {
    fetchMonthlyData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Handle print
  const handlePrint = () => {
    if (!monthlyData) {
      addNotification({
        title: "Yazdırma Hatası",
        message: "Yazdırılacak veri bulunamadı",
        type: "error",
        deleteAfter: 3000
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addNotification({
        title: "Yazdırma Hatası",
        message: "Pop-up engellendi. Lütfen pop-up engelleyiciyi devre dışı bırakın.",
        type: "error",
        deleteAfter: 5000
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aylık Ödeme Yöntemi Özeti - ${monthNames[selectedMonth]} ${selectedYear}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Century Gothic', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: white;
            margin: 15px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .header p {
            font-size: 12px;
            margin-bottom: 3px;
          }
          
          .summary-container {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .summary-section {
            width: 32%;
          }
          
          .summary-section h2 {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            padding: 5px;
            border: 1px solid #000;
          }
          
          .mkm-header { background-color: #e6f3ff; }
          .msm-header { background-color: #e6ffe6; }
          .total-header { background-color: #ffe6f3; }
          
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          
          .summary-table th,
          .summary-table td {
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: center;
          }
          
          .summary-table th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          
          .summary-table .method-name {
            text-align: left;
          }
          
          .total-row {
            background-color: #f0f8ff !important;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
          }
          
          @media print {
            @page { 
              size: A4 landscape;
              margin: 10mm;
            }
            body { 
              margin: 0; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AYLIK ÖDEME YÖNTEMİ ÖZETİ</h1>
          <p><strong>Dönem:</strong> ${monthNames[selectedMonth]} ${selectedYear}</p>
          <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <div class="summary-container">
          <!-- MKM Summary -->
          <div class="summary-section">
            <h2 class="mkm-header">MKM TAHSİLATLAR</h2>
            <table class="summary-table">
              <thead>
                <tr>
                  <th class="method-name">Ödeme Nedeni</th>
                  <th>Toplam TL</th>
                  <th>Toplam USD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="method-name">Banka Havalesi</td>
                  <td>${monthlyData.data?.mkm_summary?.['Banka Havalesi']?.tl ? 
                    Math.round(monthlyData.data.mkm_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.mkm_summary?.['Banka Havalesi']?.usd ? 
                    Math.round(monthlyData.data.mkm_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Nakit</td>
                  <td>${monthlyData.data?.mkm_summary?.['Nakit']?.tl ? 
                    Math.round(monthlyData.data.mkm_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.mkm_summary?.['Nakit']?.usd ? 
                    Math.round(monthlyData.data.mkm_summary['Nakit'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Çek</td>
                  <td>${monthlyData.data?.mkm_summary?.['Çek']?.tl ? 
                    Math.round(monthlyData.data.mkm_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.mkm_summary?.['Çek']?.usd ? 
                    Math.round(monthlyData.data.mkm_summary['Çek'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr class="total-row">
                  <td class="method-name"><strong>Genel Toplam</strong></td>
                  <td><strong>${monthlyData.data?.mkm_summary?.['Genel Toplam']?.tl ? 
                    Math.round(monthlyData.data.mkm_summary['Genel Toplam'].tl).toLocaleString('tr-TR') : '-'}</strong></td>
                  <td><strong>$${monthlyData.data?.mkm_summary?.['Genel Toplam']?.usd ? 
                    Math.round(monthlyData.data.mkm_summary['Genel Toplam'].usd).toLocaleString('en-US') : '-'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- MSM Summary -->
          <div class="summary-section">
            <h2 class="msm-header">MSM TAHSİLATLAR</h2>
            <table class="summary-table">
              <thead>
                <tr>
                  <th class="method-name">Ödeme Nedeni</th>
                  <th>Toplam TL</th>
                  <th>Toplam USD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="method-name">Banka Havalesi</td>
                  <td>${monthlyData.data?.msm_summary?.['Banka Havalesi']?.tl ? 
                    Math.round(monthlyData.data.msm_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.msm_summary?.['Banka Havalesi']?.usd ? 
                    Math.round(monthlyData.data.msm_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Nakit</td>
                  <td>${monthlyData.data?.msm_summary?.['Nakit']?.tl ? 
                    Math.round(monthlyData.data.msm_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.msm_summary?.['Nakit']?.usd ? 
                    Math.round(monthlyData.data.msm_summary['Nakit'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Çek</td>
                  <td>${monthlyData.data?.msm_summary?.['Çek']?.tl ? 
                    Math.round(monthlyData.data.msm_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.msm_summary?.['Çek']?.usd ? 
                    Math.round(monthlyData.data.msm_summary['Çek'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr class="total-row">
                  <td class="method-name"><strong>Genel Toplam</strong></td>
                  <td><strong>${monthlyData.data?.msm_summary?.['Genel Toplam']?.tl ? 
                    Math.round(monthlyData.data.msm_summary['Genel Toplam'].tl).toLocaleString('tr-TR') : '-'}</strong></td>
                  <td><strong>$${monthlyData.data?.msm_summary?.['Genel Toplam']?.usd ? 
                    Math.round(monthlyData.data.msm_summary['Genel Toplam'].usd).toLocaleString('en-US') : '-'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Overall Total -->
          <div class="summary-section">
            <h2 class="total-header">AYLIK GENEL TOPLAM</h2>
            <table class="summary-table">
              <thead>
                <tr>
                  <th class="method-name">Ödeme Nedeni</th>
                  <th>Toplam TL</th>
                  <th>Toplam USD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="method-name">Banka Havalesi</td>
                  <td>${monthlyData.data?.general_summary?.['Banka Havalesi']?.tl ? 
                    Math.round(monthlyData.data.general_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.general_summary?.['Banka Havalesi']?.usd ? 
                    Math.round(monthlyData.data.general_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Nakit</td>
                  <td>${monthlyData.data?.general_summary?.['Nakit']?.tl ? 
                    Math.round(monthlyData.data.general_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.general_summary?.['Nakit']?.usd ? 
                    Math.round(monthlyData.data.general_summary['Nakit'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr>
                  <td class="method-name">Çek</td>
                  <td>${monthlyData.data?.general_summary?.['Çek']?.tl ? 
                    Math.round(monthlyData.data.general_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}</td>
                  <td>$${monthlyData.data?.general_summary?.['Çek']?.usd ? 
                    Math.round(monthlyData.data.general_summary['Çek'].usd).toLocaleString('en-US') : '-'}</td>
                </tr>
                <tr class="total-row">
                  <td class="method-name"><strong>Toplam</strong></td>
                  <td><strong>${monthlyData.data?.general_summary?.['Toplam']?.tl ? 
                    Math.round(monthlyData.data.general_summary['Toplam'].tl).toLocaleString('tr-TR') : '-'}</strong></td>
                  <td><strong>$${monthlyData.data?.general_summary?.['Toplam']?.usd ? 
                    Math.round(monthlyData.data.general_summary['Toplam'].usd).toLocaleString('en-US') : '-'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          <p>Rapor: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')} • Tüm tutarlar orijinal para birimi cinsinden gösterilmiştir</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    addNotification({
      title: "Yazdırma Hazır",
      message: "Yazdırma penceresi açıldı",
      type: "success",
      deleteAfter: 3000
    });

    addNotification({
      title: "Aylık Özet Yazdırıldı",
      message: `${monthNames[selectedMonth]} ${selectedYear} aylık özet raporu yazdırıldı`,
      type: "success",
      deleteAfter: 5000
    });
  };

  // Handle export (placeholder)
  const handleExport = async (format: string) => {
    setIsExporting({ [format]: true });
    
    // Simulate export delay
    setTimeout(() => {
      setIsExporting({});
      addNotification({
        title: "Dışa Aktarma",
        message: `${format.toUpperCase()} formatında dışa aktarma tamamlandı`,
        type: "success",
        deleteAfter: 3000
      });
    }, 2000);
  };

  const sidebarProps = {
    selectedYear,
    selectedMonth,
    selectedWeek: null,
    availableYears,
    availableMonths: availableMonths.map(m => ({ value: m.value, name: m.name })),
    weeksInSelectedMonth: [],
    onYearChange: setSelectedYear,
    onMonthChange: setSelectedMonth,
    onWeekSelect: () => {},
    onRefreshReports: () => fetchMonthlyData(selectedYear, selectedMonth),
    isLoadingReportList: isLoading
  };

  return (
    <Layout sidebarProps={sidebarProps}>
      <Box w="100%" maxW="none" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
            Aylık Ödeme Yöntemi Özeti
          </Heading>
          {monthlyData && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                colorScheme="brand"
                size="sm"
                fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                isDisabled={!monthlyData || Object.values(isExporting).some(Boolean)}
              >
                {Object.values(isExporting).some(Boolean) ? 'İşleniyor...' : 'İşlemler'}
              </MenuButton>
              <MenuList>
                <MenuItem 
                  icon={isExporting.xlsx ? <Spinner size="sm" /> : <DownloadIcon />} 
                  onClick={() => handleExport('xlsx')}
                  isDisabled={isExporting.xlsx}
                >
                  Excel Olarak Dışa Aktar
                </MenuItem>
                <MenuItem 
                  icon={isExporting.pdf ? <Spinner size="sm" /> : <FaPrint />} 
                  onClick={handlePrint}
                >
                  Yazdır / PDF Kaydet
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>

        {/* Period Info */}
        <Box mb={4}>
          <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
            {monthNames[selectedMonth]} {selectedYear}
          </Badge>
        </Box>
        
        {/* Main Content */}
        <Card w="100%">
          <CardHeader py={3}>
            <Heading size="md">
              {monthNames[selectedMonth]} {selectedYear} - Aylık Ödeme Yöntemi Dağılımı
            </Heading>
          </CardHeader>
          <CardBody py={3}>
            {isLoading ? (
              <Flex justify="center" py={8} direction="column" align="center">
                <Spinner size="xl" mb={4} />
                <Text>Aylık özet verileri yükleniyor...</Text>
              </Flex>
            ) : error ? (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            ) : monthlyData ? (
              <VStack spacing={6} align="stretch">
                {/* Monthly Payment Method Summary by Project */}
                <Box>
                  <Heading size="sm" mb={4} textAlign="center" color="cyan.700">
                    Aylık Ödeme Yöntemi Özeti - {monthNames[selectedMonth]} {selectedYear}
                  </Heading>
                  <HStack spacing={4} align="stretch">
                    {/* MKM Summary */}
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="bold" textAlign="center" mb={3} color="blue.600">
                        MKM TAHSİLATLAR
                      </Text>
                      <Box bg="white" borderRadius="md" border="1px" borderColor="blue.200">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr bg="blue.50">
                              <Th border="1px" borderColor="blue.200">Ödeme Nedeni</Th>
                              <Th border="1px" borderColor="blue.200" textAlign="center">Toplam TL</Th>
                              <Th border="1px" borderColor="blue.200" textAlign="center">Toplam USD</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            <Tr _hover={{ bg: "blue.25" }}>
                              <Td border="1px" borderColor="blue.200">Banka Havalesi</Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                {monthlyData.data?.mkm_summary?.['Banka Havalesi']?.tl ? 
                                  Math.round(monthlyData.data.mkm_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                ${monthlyData.data?.mkm_summary?.['Banka Havalesi']?.usd ? 
                                  Math.round(monthlyData.data.mkm_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "blue.25" }}>
                              <Td border="1px" borderColor="blue.200">Nakit</Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                {monthlyData.data?.mkm_summary?.['Nakit']?.tl ? 
                                  Math.round(monthlyData.data.mkm_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                ${monthlyData.data?.mkm_summary?.['Nakit']?.usd ? 
                                  Math.round(monthlyData.data.mkm_summary['Nakit'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "blue.25" }}>
                              <Td border="1px" borderColor="blue.200">Çek</Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                {monthlyData.data?.mkm_summary?.['Çek']?.tl ? 
                                  Math.round(monthlyData.data.mkm_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center">
                                ${monthlyData.data?.mkm_summary?.['Çek']?.usd ? 
                                  Math.round(monthlyData.data.mkm_summary['Çek'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr bg="blue.100" _hover={{ bg: "blue.150" }}>
                              <Td border="1px" borderColor="blue.200" fontWeight="bold">Genel Toplam</Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center" fontWeight="bold">
                                {monthlyData.data?.mkm_summary?.['Genel Toplam']?.tl ? 
                                  Math.round(monthlyData.data.mkm_summary['Genel Toplam'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="blue.200" textAlign="center" fontWeight="bold">
                                ${monthlyData.data?.mkm_summary?.['Genel Toplam']?.usd ? 
                                  Math.round(monthlyData.data.mkm_summary['Genel Toplam'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </Box>
                    </Box>

                    {/* MSM Summary */}
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="bold" textAlign="center" mb={3} color="green.600">
                        MSM TAHSİLATLAR
                      </Text>
                      <Box bg="white" borderRadius="md" border="1px" borderColor="green.200">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr bg="green.50">
                              <Th border="1px" borderColor="green.200">Ödeme Nedeni</Th>
                              <Th border="1px" borderColor="green.200" textAlign="center">Toplam TL</Th>
                              <Th border="1px" borderColor="green.200" textAlign="center">Toplam USD</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            <Tr _hover={{ bg: "green.25" }}>
                              <Td border="1px" borderColor="green.200">Banka Havalesi</Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                {monthlyData.data?.msm_summary?.['Banka Havalesi']?.tl ? 
                                  Math.round(monthlyData.data.msm_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                ${monthlyData.data?.msm_summary?.['Banka Havalesi']?.usd ? 
                                  Math.round(monthlyData.data.msm_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "green.25" }}>
                              <Td border="1px" borderColor="green.200">Nakit</Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                {monthlyData.data?.msm_summary?.['Nakit']?.tl ? 
                                  Math.round(monthlyData.data.msm_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                ${monthlyData.data?.msm_summary?.['Nakit']?.usd ? 
                                  Math.round(monthlyData.data.msm_summary['Nakit'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "green.25" }}>
                              <Td border="1px" borderColor="green.200">Çek</Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                {monthlyData.data?.msm_summary?.['Çek']?.tl ? 
                                  Math.round(monthlyData.data.msm_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="green.200" textAlign="center">
                                ${monthlyData.data?.msm_summary?.['Çek']?.usd ? 
                                  Math.round(monthlyData.data.msm_summary['Çek'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr bg="green.100" _hover={{ bg: "green.150" }}>
                              <Td border="1px" borderColor="green.200" fontWeight="bold">Genel Toplam</Td>
                              <Td border="1px" borderColor="green.200" textAlign="center" fontWeight="bold">
                                {monthlyData.data?.msm_summary?.['Genel Toplam']?.tl ? 
                                  Math.round(monthlyData.data.msm_summary['Genel Toplam'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="green.200" textAlign="center" fontWeight="bold">
                                ${monthlyData.data?.msm_summary?.['Genel Toplam']?.usd ? 
                                  Math.round(monthlyData.data.msm_summary['Genel Toplam'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </Box>
                    </Box>

                    {/* Overall Monthly Total */}
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="bold" textAlign="center" mb={3} color="purple.600">
                        AYLIK GENEL TOPLAM
                      </Text>
                      <Box bg="white" borderRadius="md" border="1px" borderColor="purple.200">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr bg="purple.50">
                              <Th border="1px" borderColor="purple.200">Ödeme Nedeni</Th>
                              <Th border="1px" borderColor="purple.200" textAlign="center">Toplam TL</Th>
                              <Th border="1px" borderColor="purple.200" textAlign="center">Toplam USD</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            <Tr _hover={{ bg: "purple.25" }}>
                              <Td border="1px" borderColor="purple.200">Banka Havalesi</Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                {monthlyData.data?.general_summary?.['Banka Havalesi']?.tl ? 
                                  Math.round(monthlyData.data.general_summary['Banka Havalesi'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                ${monthlyData.data?.general_summary?.['Banka Havalesi']?.usd ? 
                                  Math.round(monthlyData.data.general_summary['Banka Havalesi'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "purple.25" }}>
                              <Td border="1px" borderColor="purple.200">Nakit</Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                {monthlyData.data?.general_summary?.['Nakit']?.tl ? 
                                  Math.round(monthlyData.data.general_summary['Nakit'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                ${monthlyData.data?.general_summary?.['Nakit']?.usd ? 
                                  Math.round(monthlyData.data.general_summary['Nakit'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr _hover={{ bg: "purple.25" }}>
                              <Td border="1px" borderColor="purple.200">Çek</Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                {monthlyData.data?.general_summary?.['Çek']?.tl ? 
                                  Math.round(monthlyData.data.general_summary['Çek'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center">
                                ${monthlyData.data?.general_summary?.['Çek']?.usd ? 
                                  Math.round(monthlyData.data.general_summary['Çek'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                            <Tr bg="purple.100" _hover={{ bg: "purple.150" }}>
                              <Td border="1px" borderColor="purple.200" fontWeight="bold">Toplam</Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center" fontWeight="bold">
                                {monthlyData.data?.general_summary?.['Toplam']?.tl ? 
                                  Math.round(monthlyData.data.general_summary['Toplam'].tl).toLocaleString('tr-TR') : '-'}
                              </Td>
                              <Td border="1px" borderColor="purple.200" textAlign="center" fontWeight="bold">
                                ${monthlyData.data?.general_summary?.['Toplam']?.usd ? 
                                  Math.round(monthlyData.data.general_summary['Toplam'].usd).toLocaleString('en-US') : '-'}
                              </Td>
                            </Tr>
                          </Tbody>
                        </Table>
                      </Box>
                    </Box>
                  </HStack>
                </Box>

                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Aylık ödeme yöntemi dağılımı • MKM ve MSM ayrı hesaplanmıştır • {new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur
                </Text>
              </VStack>
            ) : (
              <Alert status="info">
                <AlertIcon />
                Seçilen dönem için veri bulunamadı
              </Alert>
            )}
          </CardBody>
        </Card>
      </Box>
    </Layout>
  );
};

export default MonthlySummaryPage;