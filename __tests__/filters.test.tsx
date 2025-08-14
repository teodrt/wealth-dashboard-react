import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FiltersBar from '../src/components/FiltersBar';

// Mock the GlassCard component
jest.mock('../src/components/GlassCard', () => {
  return function MockGlassCard({ children, className }: any) {
    return <div className={className}>{children}</div>;
  };
});

describe('FiltersBar Component', () => {
  const mockProps = {
    query: '',
    setQuery: jest.fn(),
    categoryFilter: 'All',
    setCategoryFilter: jest.fn(),
    accountFilter: 'All',
    setAccountFilter: jest.fn(),
    categories: ['Cash', 'Equity', 'Bond'],
    accounts: ['Account1', 'Account2', 'Account3'],
    onResetData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all filter elements', () => {
    render(<FiltersBar {...mockProps} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    expect(screen.getByText('Reset Data')).toBeInTheDocument();
  });

  test('search input updates query', () => {
    render(<FiltersBar {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    expect(mockProps.setQuery).toHaveBeenCalledWith('test query');
  });

  test('category filter updates category', () => {
    render(<FiltersBar {...mockProps} />);
    
    const categorySelect = screen.getByText('All Categories').closest('select');
    fireEvent.change(categorySelect!, { target: { value: 'Cash' } });
    
    expect(mockProps.setCategoryFilter).toHaveBeenCalledWith('Cash');
  });

  test('account filter updates account', () => {
    render(<FiltersBar {...mockProps} />);
    
    const accountSelect = screen.getByText('All Accounts').closest('select');
    fireEvent.change(accountSelect!, { target: { value: 'Account1' } });
    
    expect(mockProps.setAccountFilter).toHaveBeenCalledWith('Account1');
  });

  test('reset data button calls onResetData', () => {
    render(<FiltersBar {...mockProps} />);
    
    const resetButton = screen.getByText('Reset Data');
    fireEvent.click(resetButton);
    
    expect(mockProps.onResetData).toHaveBeenCalled();
  });

  test('shows reset buttons when filters are not "All"', () => {
    const propsWithFilters = {
      ...mockProps,
      categoryFilter: 'Cash',
      accountFilter: 'Account1',
    };
    
    render(<FiltersBar {...propsWithFilters} />);
    
    // Should show reset buttons for both filters
    const resetButtons = screen.getAllByRole('button').filter(button => 
      button.getAttribute('title')?.includes('Reset')
    );
    
    expect(resetButtons).toHaveLength(2);
  });

  test('category reset button only resets category', () => {
    const propsWithCategoryFilter = {
      ...mockProps,
      categoryFilter: 'Cash',
    };
    
    render(<FiltersBar {...propsWithCategoryFilter} />);
    
    const categoryResetButton = screen.getByTitle('Reset category filter');
    fireEvent.click(categoryResetButton);
    
    expect(mockProps.setCategoryFilter).toHaveBeenCalledWith('All');
    expect(mockProps.setAccountFilter).not.toHaveBeenCalled();
  });

  test('account reset button only resets account', () => {
    const propsWithAccountFilter = {
      ...mockProps,
      accountFilter: 'Account1',
    };
    
    render(<FiltersBar {...propsWithAccountFilter} />);
    
    const accountResetButton = screen.getByTitle('Reset account filter');
    fireEvent.click(accountResetButton);
    
    expect(mockProps.setAccountFilter).toHaveBeenCalledWith('All');
    expect(mockProps.setCategoryFilter).not.toHaveBeenCalled();
  });

  test('default values are "All"', () => {
    render(<FiltersBar {...mockProps} />);
    
    const categorySelect = screen.getByText('All Categories').closest('select');
    const accountSelect = screen.getByText('All Accounts').closest('select');
    
    expect(categorySelect).toHaveValue('All');
    expect(accountSelect).toHaveValue('All');
  });
});

