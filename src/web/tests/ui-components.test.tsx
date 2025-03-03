import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import { axe } from 'jest-axe';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '../components/ui/Card';
import { 
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '../components/ui/Select';
import { cn } from '../lib/utils';

// Button component tests
describe('Button component', () => {
  test('renders with default styling', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600'); // Primary variant is default
  });

  test('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-teal-600');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-gray-300');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-gray-50');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10 px-4 py-2');

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8 px-3 py-1 text-xs');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-12 px-6 py-3 text-base');

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10 w-10 p-0');
  });

  test('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('displays loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    
    const button = screen.getByRole('button');
    const spinner = document.querySelector('.animate-spin');
    
    expect(spinner).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  test('uses Slot component when asChild is true', () => {
    const CustomButton = React.forwardRef<
      HTMLAnchorElement,
      React.AnchorHTMLAttributes<HTMLAnchorElement>
    >(({ children, ...props }, ref) => (
      <a ref={ref} {...props}>{children}</a>
    ));
    CustomButton.displayName = 'CustomButton';

    render(
      <Button asChild>
        <CustomButton href="#">Custom Button</CustomButton>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /custom button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#');
    expect(link).toHaveClass('bg-blue-600'); // Should have button styling
  });

  test('has no accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Input component tests
describe('Input component', () => {
  test('renders with default styling', () => {
    render(<Input aria-label="test-input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border');
    expect(input).not.toBeDisabled();
  });

  test('applies different input types', () => {
    const { rerender } = render(<Input type="text" aria-label="text-input" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');

    rerender(<Input type="email" aria-label="email-input" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" aria-label="password-input" />);
    // Note: password inputs aren't exposed as 'textbox' role
    expect(screen.getByLabelText('password-input')).toHaveAttribute('type', 'password');
  });

  test('displays placeholder text', () => {
    render(<Input placeholder="Enter text here" />);
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  test('updates value on change', async () => {
    render(<Input aria-label="test-input" />);
    const input = screen.getByRole('textbox');
    
    await userEvent.type(input, 'Hello World');
    expect(input).toHaveValue('Hello World');
  });

  test('applies error styling when error prop is true', () => {
    render(<Input error aria-label="error-input" />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('forwards ref to the input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="ref-input" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  test('applies disabled styling and attributes', () => {
    render(<Input disabled aria-label="disabled-input" />);
    const input = screen.getByLabelText('disabled-input');
    
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50');
  });

  test('has no accessibility violations', async () => {
    const { container } = render(
      <label htmlFor="accessible-input">
        Email
        <Input id="accessible-input" type="email" placeholder="Enter your email" />
      </label>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Card component tests
describe('Card component', () => {
  test('renders Card with default styling', () => {
    render(<Card>Card Content</Card>);
    const card = screen.getByText('Card Content').closest('div');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-lg border bg-card shadow-sm');
  });

  test('applies custom className', () => {
    render(<Card className="custom-class">Card Content</Card>);
    const card = screen.getByText('Card Content').closest('div');
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('rounded-lg border bg-card shadow-sm');
  });

  test('renders CardHeader with proper spacing', () => {
    render(
      <Card>
        <CardHeader>Header Content</CardHeader>
      </Card>
    );
    const header = screen.getByText('Header Content').closest('div');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('flex flex-col space-y-1.5 p-6');
  });

  test('renders CardTitle with appropriate heading level', () => {
    const { rerender } = render(
      <Card>
        <CardHeader>
          <CardTitle>Default Title</CardTitle>
        </CardHeader>
      </Card>
    );
    
    // Default should be h3
    let title = screen.getByText('Default Title');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('text-2xl font-semibold');
    
    rerender(
      <Card>
        <CardHeader>
          <CardTitle as="h2">H2 Title</CardTitle>
        </CardHeader>
      </Card>
    );
    
    title = screen.getByText('H2 Title');
    expect(title.tagName).toBe('H2');
    expect(title).toHaveClass('text-2xl font-semibold');
  });

  test('renders CardDescription with muted text', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
      </Card>
    );
    const description = screen.getByText('Card description text');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm text-muted-foreground');
    expect(description.tagName).toBe('P');
  });

  test('renders CardContent with appropriate padding', () => {
    render(
      <Card>
        <CardContent>Content area</CardContent>
      </Card>
    );
    const content = screen.getByText('Content area').closest('div');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('p-6 pt-0');
  });

  test('renders CardFooter with proper alignment', () => {
    render(
      <Card>
        <CardFooter>
          <button>Cancel</button>
          <button>Submit</button>
        </CardFooter>
      </Card>
    );
    const footer = screen.getByText('Cancel').closest('div');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('flex items-center p-6 pt-0');
  });

  test('composes all subcomponents correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          Main content area
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  test('has no accessibility violations', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Accessible Card</CardTitle>
          <CardDescription>This card follows accessibility guidelines</CardDescription>
        </CardHeader>
        <CardContent>
          Content with good contrast and structure
        </CardContent>
        <CardFooter>
          <button>Close</button>
        </CardFooter>
      </Card>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Select component tests
describe('Select component', () => {
  // Mocking onChange handler for tests
  const mockOnChange = jest.fn();
  
  beforeEach(() => {
    mockOnChange.mockClear();
  });
  
  test('renders closed Select with placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByText('Select an option')).toBeInTheDocument();
    // Content should not be visible when closed
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });
  
  test('opens dropdown when clicked', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByText('Select an option');
    await userEvent.click(trigger);
    
    // After clicking, options should be visible
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });
  
  test('closes when item is selected', async () => {
    render(
      <Select onValueChange={mockOnChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Open the select
    const trigger = screen.getByText('Select an option');
    await userEvent.click(trigger);
    
    // Wait for the content to appear
    const option1 = await screen.findByText('Option 1');
    
    // Select an option
    await userEvent.click(option1);
    
    // The content should close and the selected option should be displayed
    await waitFor(() => {
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });
  
  test('updates value when item is selected', async () => {
    render(
      <Select onValueChange={mockOnChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Open the select
    const trigger = screen.getByText('Select an option');
    await userEvent.click(trigger);
    
    // Wait for the content to appear
    const option1 = await screen.findByText('Option 1');
    
    // Select an option
    await userEvent.click(option1);
    
    // Check if onChange was called with the correct value
    expect(mockOnChange).toHaveBeenCalledWith('option1');
  });
  
  test('applies disabled styling to trigger', () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Disabled select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).toHaveClass('disabled:cursor-not-allowed disabled:opacity-50');
  });
  
  test('applies error styling when error prop is true', () => {
    render(
      <Select>
        <SelectTrigger error>
          <SelectValue placeholder="Error select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('border-red-500');
  });
  
  test('navigates options with keyboard', async () => {
    render(
      <Select onValueChange={mockOnChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Focus and open the select with keyboard
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    
    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
    
    // Navigate with arrow down
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' });
    
    // Check if the first option was selected (default focus is on first item)
    expect(mockOnChange).toHaveBeenCalledWith('option1');
  });
  
  test('has appropriate ARIA attributes', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Options">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-label', 'Options');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
  
  test('has no accessibility violations', async () => {
    const { container } = render(
      <Select>
        <SelectTrigger aria-label="Fruit selection">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// cn utility tests
describe('cn utility', () => {
  test('combines multiple class strings', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toBe('class1 class2 class3');
  });
  
  test('includes conditional classes', () => {
    const condition1 = true;
    const condition2 = false;
    
    const result = cn(
      'base-class',
      condition1 && 'conditional-class-1',
      condition2 && 'conditional-class-2'
    );
    
    expect(result).toBe('base-class conditional-class-1');
    expect(result).not.toContain('conditional-class-2');
  });
  
  test('handles undefined and null gracefully', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });
  
  test('resolves conflicting Tailwind classes', () => {
    const result = cn(
      'pt-4', // padding top
      'p-6',  // padding (all sides), should override the pt-4
      'text-red-500',
      'text-blue-600' // should override text-red-500
    );
    
    // tailwind-merge should handle the conflicts
    expect(result).toContain('p-6');
    expect(result).not.toContain('pt-4');
    expect(result).toContain('text-blue-600');
    expect(result).not.toContain('text-red-500');
  });
});