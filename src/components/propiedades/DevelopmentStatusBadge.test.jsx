/**
 * Tests for DevelopmentStatusBadge component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import DevelopmentStatusBadge, { STATUS_MAP } from './DevelopmentStatusBadge';

describe('DevelopmentStatusBadge', () => {

  // ─── STATUS_MAP data integrity ───
  describe('STATUS_MAP', () => {
    const expectedStatuses = ['draft', 'pending_approval', 'needs_changes', 'active', 'sold_out', 'archived'];

    it('contains all expected development statuses', () => {
      expectedStatuses.forEach(status => {
        expect(STATUS_MAP).toHaveProperty(status);
      });
    });

    it('each status entry has key, bg, and dot', () => {
      expectedStatuses.forEach(status => {
        const entry = STATUS_MAP[status];
        expect(entry).toHaveProperty('key');
        expect(entry).toHaveProperty('bg');
        expect(entry).toHaveProperty('dot');
      });
    });
  });

  // ─── Rendering ───
  describe('rendering', () => {
    const mockT = (key) => {
      const translations = {
        dev_status_draft: 'Borrador',
        dev_status_pending: 'Pendiente',
        dev_status_needs_changes: 'Necesita Cambios',
        dev_status_active: 'Activo',
        dev_status_sold_out: 'Agotado',
        dev_status_archived: 'Archivado',
      };
      return translations[key] || key;
    };

    it('renders translated draft label', () => {
      render(<DevelopmentStatusBadge status="draft" t={mockT} />);
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });

    it('renders active status', () => {
      render(<DevelopmentStatusBadge status="active" t={mockT} />);
      expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('renders sold_out status', () => {
      render(<DevelopmentStatusBadge status="sold_out" t={mockT} />);
      expect(screen.getByText('Agotado')).toBeInTheDocument();
    });

    it('falls back to draft for unknown status', () => {
      render(<DevelopmentStatusBadge status="fake_status" t={mockT} />);
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });

    it('renders all statuses without errors', () => {
      const statuses = ['draft', 'pending_approval', 'needs_changes', 'active', 'sold_out', 'archived'];
      statuses.forEach(status => {
        const { unmount } = render(<DevelopmentStatusBadge status={status} t={mockT} />);
        unmount();
      });
    });

    it('supports different sizes', () => {
      const { container: sm } = render(<DevelopmentStatusBadge status="active" t={mockT} size="sm" />);
      const { container: lg } = render(<DevelopmentStatusBadge status="active" t={mockT} size="lg" />);
      // Just verify they render without error
      expect(sm.firstChild).toBeTruthy();
      expect(lg.firstChild).toBeTruthy();
    });
  });
});
