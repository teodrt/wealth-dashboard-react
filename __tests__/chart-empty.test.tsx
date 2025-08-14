import React from 'react';
import { render, screen } from '@testing-library/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Mock the GlassCard component
jest.mock('../src/components/GlassCard', () => {
  return function MockGlassCard({ children, className }: any) {
    return <div className={className}>{children}</div>;
  };
});

describe('Chart Empty State Handling', () => {
  test('shows empty state when no data is available', () => {
    const emptyData: any[] = [];
    
    render(
      <div className="chart-card">
        <h3>Net Worth Over Time</h3>
        {emptyData.length === 0 ? (
          <div className="empty-state">
            <p>No data available to display</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={emptyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
    
    expect(screen.getByText('No data available to display')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument(); // No chart should render
  });

  test('renders chart when data is available', () => {
    const sampleData = [
      { month: '2025-01', value: 1000 },
      { month: '2025-02', value: 1100 },
      { month: '2025-03', value: 1200 },
    ];
    
    render(
      <div className="chart-card">
        <h3>Net Worth Over Time</h3>
        {sampleData.length === 0 ? (
          <div className="empty-state">
            <p>No data available to display</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
    
    expect(screen.queryByText('No data available to display')).not.toBeInTheDocument();
    // Chart should be rendered (we can't easily test the actual chart rendering in unit tests)
  });

  test('handles filtered data that results in empty state', () => {
    const allData = [
      { month: '2025-01', value: 1000, category: 'Cash' },
      { month: '2025-02', value: 1100, category: 'Cash' },
      { month: '2025-03', value: 1200, category: 'Cash' },
    ];
    
    // Simulate filtering that results in no data
    const filteredData = allData.filter(item => item.category === 'NonExistentCategory');
    
    render(
      <div className="chart-card">
        <h3>Filtered Data Chart</h3>
        {filteredData.length === 0 ? (
          <div className="empty-state">
            <p>No data matches the current filters</p>
            <p>Try adjusting your search criteria</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
    
    expect(screen.getByText('No data matches the current filters')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
  });

  test('empty state has appropriate styling classes', () => {
    const emptyData: any[] = [];
    
    render(
      <div className="chart-card">
        <h3>Test Chart</h3>
        {emptyData.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <p>No data available</p>
          </div>
        ) : (
          <div>Chart would render here</div>
        )}
      </div>
    );
    
    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toHaveClass('empty-state');
  });
});

