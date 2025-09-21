import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Icon,
  Divider,
  useColorModeValue,
  Card,
  CardBody,
  Avatar,
  Badge,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { FiSend, FiUser, FiMessageCircle, FiCalendar, FiBarChart, FiFileText } from 'react-icons/fi';
import axios from 'axios';

// Message types for chat
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  loading?: boolean;
  tool?: string;
  data?: any;
}

const AIAssistantPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to the Tahsilat AI Assistant! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle sending a message to the AI assistant
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);

    // Add loading message
    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        loading: true,
      },
    ]);

    setInput('');
    setIsLoading(true);

    try {
      // Send the message to the AI assistant API
      const response = await axios.post('/api/assistant', {
        message: userMessage.content,
        history: messages
          .filter((msg) => msg.role !== 'system')
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
      });

      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));

      // Add AI response
      if (response.data.tool) {
        // If the response includes a tool call
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: response.data.content,
            timestamp: new Date(),
            tool: response.data.tool,
            data: response.data.data,
          },
        ]);
      } else {
        // Regular text response
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: response.data.content,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error communicating with AI assistant:', error);
      
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
      
      toast({
        title: 'Error',
        description: 'Failed to communicate with the AI assistant.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>
        AI Assistant
      </Heading>

      <Card height="70vh" display="flex" flexDirection="column">
        <CardBody display="flex" flexDirection="column" p={0} overflow="hidden">
          {/* Chat messages area */}
          <Box
            flex="1"
            overflowY="auto"
            p={4}
            bg={useColorModeValue('gray.50', 'gray.700')}
          >
            <VStack spacing={4} align="stretch">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          <Divider />

          {/* Input area */}
          <Box p={4}>
            <HStack>
              <Input
                placeholder="Ask me about your payment data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                size="lg"
                disabled={isLoading}
              />
              <Button
                colorScheme="brand"
                onClick={handleSendMessage}
                isLoading={isLoading}
                disabled={!input.trim() || isLoading}
                size="lg"
              >
                <Icon as={FiSend} />
              </Button>
            </HStack>
          </Box>
        </CardBody>
      </Card>

      {/* Suggested queries */}
      <Card mt={4}>
        <CardBody>
          <Heading size="sm" mb={4}>
            Suggested Queries
          </Heading>
          <Flex flexWrap="wrap" gap={2}>
            <SuggestedQuery
              query="Show me total payments for last month"
              icon={FiCalendar}
              onClick={(query) => {
                setInput(query);
              }}
            />
            <SuggestedQuery
              query="What's our best payment channel?"
              icon={FiBarChart}
              onClick={(query) => {
                setInput(query);
              }}
            />
            <SuggestedQuery
              query="Generate weekly USD report"
              icon={FiFileText}
              onClick={(query) => {
                setInput(query);
              }}
            />
            <SuggestedQuery
              query="Show payments from Property ID 123"
              icon={FiMessageCircle}
              onClick={(query) => {
                setInput(query);
              }}
            />
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
};

// Message component for displaying chat messages
interface MessageProps {
  message: Message;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Different styling based on message type
  const bgColor = useColorModeValue(
    isUser ? 'brand.50' : isSystem ? 'gray.100' : 'white',
    isUser ? 'brand.800' : isSystem ? 'gray.700' : 'gray.800'
  );
  const textColor = useColorModeValue('gray.800', 'white');
  
  // Format the timestamp
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(message.timestamp);

  return (
    <Box
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="80%"
      bg={bgColor}
      p={4}
      borderRadius="lg"
      boxShadow="sm"
    >
      <Flex mb={2} align="center">
        {!isUser && (
          <Avatar
            size="xs"
            bg={isSystem ? 'gray.500' : 'brand.500'}
            mr={2}
            icon={<Icon as={isSystem ? FiMessageCircle : FiUser} fontSize="0.8rem" />}
          />
        )}
        <Text fontWeight="bold" fontSize="sm">
          {isUser ? 'You' : isSystem ? 'System' : 'AI Assistant'}
        </Text>
        {message.tool && (
          <Badge ml={2} colorScheme="purple">
            {message.tool}
          </Badge>
        )}
        <Text fontSize="xs" color="gray.500" ml="auto">
          {formattedTime}
        </Text>
      </Flex>

      {message.loading ? (
        <Flex align="center" justify="center" py={2}>
          <Spinner size="sm" mr={2} />
          <Text>Thinking...</Text>
        </Flex>
      ) : (
        <Text color={textColor}>{message.content}</Text>
      )}

      {/* If there's tool data, render it appropriately */}
      {message.data && message.tool === 'report' && (
        <Box mt={3} p={3} bg={useColorModeValue('white', 'gray.700')} borderRadius="md">
          <Text fontWeight="bold">{message.data.report_name}</Text>
          <Text>Total USD: ${message.data.summary.total_usd.toFixed(2)}</Text>
          <Text>Records: {message.data.summary.total_count}</Text>
        </Box>
      )}
    </Box>
  );
};

// Suggested query component
interface SuggestedQueryProps {
  query: string;
  icon: React.ElementType;
  onClick: (query: string) => void;
}

const SuggestedQuery: React.FC<SuggestedQueryProps> = ({ query, icon, onClick }) => {
  return (
    <Button
      variant="outline"
      leftIcon={<Icon as={icon} />}
      onClick={() => onClick(query)}
      mb={2}
      mr={2}
    >
      {query}
    </Button>
  );
};

export default AIAssistantPage;