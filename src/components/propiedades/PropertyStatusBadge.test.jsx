/**
 * Tests for PropertyStatusBadge component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import PropertyStatusBadge, { STATUS_CONFIG } from './PropertyStatusBadge';

describe('PropertyStatusBadge', () => {

  // ─── STATUS_CONFIG data integrity ───
  describe('STATUS_CONFIG', () => {
    const expectedStatuses = ['draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'sold', 'cancelled'];

    it('contains all expected statuses', () => {
      expectedStatuses.forEach(status => {
        expect(STATUS_CONFIG).toHaveProperty(status);
      });
    });

    it('each status has label_es, label_en, color, dot, and icon', () => {
      expectedStatuses.forEach(status => {
        const config = STATUS_CONFIG[status];
        expect(config).toHaveProperty('label_es');
        expect(config).toHaveProperty('label_en');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('dot');
        expect(config).toHaveProperty('icon');
      });
    });
  });

  // ─── Rendering ───
  describe('rendering', () => {
    it('renders "Borrador" for draft status in Spanish', () => {
      render(<PropertyStatusBadge status="draft" lang="es" />);
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });

    it('renders "Draft" for draft status in English', () => {
      render(<PropertyStatusBadge status="draft" lang="en" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders "Publicada" for published status', () => {
      render(<PropertyStatusBadge status="published" lang="es" />);
      expect(screen.getByText('Publicada')).toBeInTheDocument();
    });

    it('renders "Sold" for sold status in English', () => {
      render(<PropertyStatusBadge status="sold" lang="en" />);
      expect(screen.getByText('Sold')).toBeInTheDocument();
    });

    it('falls back to draft for unknown status', () => {
      render(<PropertyStatusBadge status="unknown_status" lang="es" />);
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });

    it('defaults to Spanish when no lang is provided', () => {
      render(<PropertyStatusBadge status="approved" />);
      expect(screen.getByText('Aprobada')).toBeInTheDocument();
    });

    it('renders all statuses without errors', () => {
      const statuses = ['draft', 'pending_approval', 'needs_changes', 'approved', 'published', 'sold', 'cancelled'];
      statuses.forEach(status => {
        const { unmount } = render(<PropertyStatusBadge status={status} lang="es" />);
        unmount();
      });
    });
  });
});
