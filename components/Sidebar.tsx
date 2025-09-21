import React from 'react';
import { Box, VStack, Icon, Tooltip, Flex, Text, Divider, useColorModeValue } from '@chakra-ui/react';
import { FiHome, FiUpload, FiDatabase, FiBarChart2, FiSettings } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, href }) => {
  const router = useRouter();
  const isActive = router.pathname === href;
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const activeColor = useColorModeValue('brand.500', 'brand.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Link href={href} legacyBehavior>
      <Box
        as="a"
        display="block"
        w="full"
        py={3}
        px={4}
        rounded="md"
        transition="all 0.2s"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : undefined}
        cursor="pointer"
        _hover={{
          bg: isActive ? activeBg : hoverBg,
          textDecoration: 'none',
        }}
      >
        <Flex align="center">
          <Icon as={icon} fontSize="xl" mr={3} />
          <Text fontWeight="medium">{label}</Text>
        </Flex>
      </Box>
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      as="aside"
      w="250px"
      h="100%"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      py={6}
    >
      <Flex align="center" justify="center" mb={8}>
        <Text fontSize="2xl" fontWeight="bold" color="brand.500">
          Tahsilat Raporu
        </Text>
      </Flex>
      <VStack spacing={1} align="stretch" px={3}>
        <NavItem icon={FiHome} label="Dashboard" href="/" />
        <NavItem icon={FiUpload} label="Import Data" href="/import" />
        <NavItem icon={FiDatabase} label="Payment Data" href="/payments" />
        <NavItem icon={FiBarChart2} label="Reports" href="/reports" />
        <Divider my={4} />
        <NavItem icon={FiSettings} label="Settings" href="/settings" />
      </VStack>
    </Box>
  );
};

export default Sidebar;