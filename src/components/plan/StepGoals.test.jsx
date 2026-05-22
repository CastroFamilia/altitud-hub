import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StepGoals from './StepGoals';

// Mock context and translations
jest.mock('@/lib/context', () => ({
  useApp: () => ({
    t: (key) => key,
  }),
}));

// Mock formatMoney since it's an exported function from PlanWizard
jest.mock('./PlanWizard', () => ({
  formatMoney: (amount, currency) => {
    const symbol = currency === 'CRC' ? '₡' : '$';
    return `${symbol}${amount}`;
  },
}));

describe('StepGoals Component', () => {
  const defaultPlan = {
    currency: 'USD',
    goals: [],
  };

  const mockUpdatePlan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with empty goals', () => {
    render(<StepGoals plan={defaultPlan} updatePlan={mockUpdatePlan} />);
    
    // Check header text
    expect(screen.getByText('pw_s4_title')).toBeInTheDocument();
    expect(screen.getByText('pw_s4_subtitle')).toBeInTheDocument();
    
    // Check if suggestion chips are rendered
    expect(screen.getByText(/pw_s4_sug_car/)).toBeInTheDocument();
    expect(screen.getByText(/pw_s4_sug_travel/)).toBeInTheDocument();
    
    // Check add button
    expect(screen.getByText('pw_s4_add')).toBeInTheDocument();
  });

  it('calls updatePlan when adding a suggested goal', () => {
    render(<StepGoals plan={defaultPlan} updatePlan={mockUpdatePlan} />);
    
    // Click on the first suggestion (car)
    const carSuggestion = screen.getByText(/pw_s4_sug_car/);
    fireEvent.click(carSuggestion);
    
    // Expect updatePlan to be called with a new goal
    expect(mockUpdatePlan).toHaveBeenCalledWith({
      goals: [
        expect.objectContaining({
          name: 'pw_s4_sug_car',
          emoji: '🚗',
          total: 0,
          months: 12,
          monthly: 0,
        })
      ]
    });
  });

  it('renders existing goals and handles updates', () => {
    const planWithGoals = {
      currency: 'CRC',
      goals: [
        {
          id: 'goal_123',
          name: 'New Car',
          emoji: '🚗',
          total: 12000,
          months: 12,
          monthly: 1000,
        }
      ]
    };

    render(<StepGoals plan={planWithGoals} updatePlan={mockUpdatePlan} />);
    
    // Check if goal details are rendered
    expect(screen.getByDisplayValue('New Car')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12000')).toBeInTheDocument();
    
    // Update goal name
    const nameInput = screen.getByDisplayValue('New Car');
    fireEvent.change(nameInput, { target: { value: 'Awesome New Car' } });
    
    expect(mockUpdatePlan).toHaveBeenCalledWith({
      goals: [
        expect.objectContaining({
          name: 'Awesome New Car',
        })
      ]
    });
  });

  it('handles goal removal', () => {
    const planWithGoals = {
      currency: 'USD',
      goals: [
        {
          id: 'goal_123',
          name: 'Vacation',
          emoji: '✈️',
          total: 5000,
          months: 6,
          monthly: 833,
        }
      ]
    };

    render(<StepGoals plan={planWithGoals} updatePlan={mockUpdatePlan} />);
    
    const removeButton = screen.getByText('pw_s4_remove');
    fireEvent.click(removeButton);
    
    expect(mockUpdatePlan).toHaveBeenCalledWith({
      goals: []
    });
  });
});
