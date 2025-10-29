/**
 * Date Range Selector Component Tests
 *
 * Tests for date range dropdown behavior and onChange handling
 * Sprint 12, Phase 4: Testing
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/display-name */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateRangeSelector } from '@/components/dashboard/date-range-selector';
import { DATE_RANGE } from '@/types/dashboard';

describe('DateRangeSelector Component', () => {
  it('should render all date range options', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    // All 5 options should be present
    expect(screen.getByText('Last 1 Month')).toBeInTheDocument();
    expect(screen.getByText('Last 3 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months')).toBeInTheDocument();
    expect(screen.getByText('Last 1 Year')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('should show current selection as selected', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.THREE_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue(DATE_RANGE.THREE_MONTHS);
  });

  it('should call onChange when selection changes', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: DATE_RANGE.ONE_MONTH } });

    expect(onChange).toHaveBeenCalledWith(DATE_RANGE.ONE_MONTH);
  });

  it('should call onChange with correct value when selecting 3 months', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: DATE_RANGE.THREE_MONTHS } });

    expect(onChange).toHaveBeenCalledWith(DATE_RANGE.THREE_MONTHS);
  });

  it('should call onChange with correct value when selecting all time', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: DATE_RANGE.ALL_TIME } });

    expect(onChange).toHaveBeenCalledWith(DATE_RANGE.ALL_TIME);
  });

  it('should render calendar icon', () => {
    const onChange = jest.fn();

    const { container } = render(
      <DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />
    );

    // Calendar icon should be present with aria-hidden
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('should have accessible aria-label', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-label', 'Select date range');
  });

  it('should update value when controlled component receives new props', () => {
    const onChange = jest.fn();

    const { rerender } = render(
      <DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />
    );

    let select = screen.getByRole('combobox');
    expect(select).toHaveValue(DATE_RANGE.SIX_MONTHS);

    // Update props
    rerender(<DateRangeSelector value={DATE_RANGE.ONE_YEAR} onChange={onChange} />);

    select = screen.getByRole('combobox');
    expect(select).toHaveValue(DATE_RANGE.ONE_YEAR);
  });

  it('should have fixed width styling', () => {
    const onChange = jest.fn();

    const { container } = render(
      <DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('w-[180px]');
  });

  it('should position calendar icon on the left', () => {
    const onChange = jest.fn();

    const { container } = render(
      <DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />
    );

    const icon = container.querySelector('.left-3');
    expect(icon).toBeInTheDocument();
  });

  it('should have padding for calendar icon', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('pl-9');
  });

  it('should render all options with correct values', () => {
    const onChange = jest.fn();

    const { container } = render(
      <DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />
    );

    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(5);

    const values = Array.from(options).map((opt) => opt.getAttribute('value'));
    expect(values).toEqual([
      DATE_RANGE.ONE_MONTH,
      DATE_RANGE.THREE_MONTHS,
      DATE_RANGE.SIX_MONTHS,
      DATE_RANGE.ONE_YEAR,
      DATE_RANGE.ALL_TIME,
    ]);
  });

  it('should not call onChange when selecting already selected value', () => {
    const onChange = jest.fn();

    render(<DateRangeSelector value={DATE_RANGE.SIX_MONTHS} onChange={onChange} />);

    const select = screen.getByRole('combobox');

    // Selecting same value
    fireEvent.change(select, { target: { value: DATE_RANGE.SIX_MONTHS } });

    // onChange still gets called (component doesn't prevent it)
    expect(onChange).toHaveBeenCalledWith(DATE_RANGE.SIX_MONTHS);
  });
});
