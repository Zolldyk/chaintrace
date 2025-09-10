/**
 * Batch Creation Page for Cooperative Managers
 *
 * A comprehensive interface for cooperative managers to log product batches
 * with all required information through an intuitive web interface. Integrates
 * all components from Story 2.2 including form management, validation,
 * compliance checking, and success confirmation.
 *
 * Features:
 * - Complete batch creation workflow
 * - Real-time form validation and compliance checking
 * - Batch operation support with bulk actions
 * - Local storage backup and recovery
 * - Performance monitoring and optimization
 * - Success confirmation with QR code generation
 *
 * @since 1.0.0
 */

'use client';

import * as React from 'react';
import { ProductBatchForm } from '@/components/dashboard/ProductBatchForm';
import { BatchSummary } from '@/components/dashboard/BatchSummary';
import { BatchSuccessConfirmation, type NavigationAction, type QRDownloadFormat } from '@/components/dashboard/BatchSuccessConfirmation';
import { useBatchCreation } from '@/hooks/useBatchCreation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type {
  CreateProductBatch,
  BatchCreationResponse,
  FormBackupData,
} from '@/types/batch';

/**
 * Page state management
 */
type PageState = 'form' | 'success' | 'error';

/**
 * Batch Creation Page Component
 */
export default function BatchCreatePage() {
  // Page state
  const [pageState, setPageState] = React.useState<PageState>('form');
  const [batchResult, setBatchResult] = React.useState<BatchCreationResponse | null>(null);
  const [showAdvancedStats, setShowAdvancedStats] = React.useState(false);

  // Initialize batch creation hook
  const {
    formState,
    updateProduct,
    updateBatchInfo,
    addProduct,
    removeProduct,
    submitBatch,
    clearForm,
    loadFromBackup,
    saveBackup,
    validateBatch,
    revalidateCompliance,
    bulkOperations,
    isSubmitting,
    hasChanges,
    isValid,
    error,
    metrics,
    selectedProducts,
    setSelectedProducts,
  } = useBatchCreation({
    maxBatchSize: 100,
    enableBackup: true,
    backupInterval: 30000, // 30 seconds
    enableCompliance: true,
    complianceDebounceMs: 2000, // 2 seconds
  });

  // Check for backup on component mount
  React.useEffect(() => {
    const hasBackup = loadFromBackup();
    if (hasBackup) {
      // Show notification about restored data (could implement toast here)
      console.log('Form data restored from backup');
    }
  }, [loadFromBackup]);

  // Handle form submission
  const handleFormSubmit = async (batchData: CreateProductBatch) => {
    try {
      const result = await submitBatch();
      setBatchResult(result);
      setPageState('success');
    } catch (error) {
      console.error('Batch submission failed:', error);
      setPageState('error');
    }
  };

  // Handle backup events
  const handleBackup = (data: FormBackupData) => {
    // Could implement backup status notification here
    console.log('Form data backed up:', data.timestamp);
  };

  // Handle success page navigation
  const handleSuccessNavigation = (action: NavigationAction, data?: any) => {
    switch (action) {
      case 'view_dashboard':
        // Navigate to dashboard (would use router in real app)
        console.log('Navigate to dashboard');
        break;
      case 'create_another':
        clearForm();
        setPageState('form');
        setBatchResult(null);
        break;
      case 'view_products':
        // Navigate to products view with data
        console.log('Navigate to products view:', data);
        break;
      case 'download_qr':
        // Handle QR download
        console.log('Download QR codes');
        break;
    }
  };

  // Handle QR code downloads
  const handleQRDownload = async (productIds: string[], format: QRDownloadFormat) => {
    try {
      // In a real implementation, this would generate and download QR codes
      console.log(`Downloading ${productIds.length} QR codes as ${format}`);
      
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Could implement actual file generation and download here
      alert(`Downloaded ${productIds.length} QR codes as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('QR download failed:', error);
      alert('Failed to download QR codes. Please try again.');
    }
  };

  // Handle copying product IDs
  const handleCopyProductIds = async (productIds: string[]) => {
    try {
      const idsText = productIds.join('\n');
      await navigator.clipboard.writeText(idsText);
      // Could show toast notification here
      console.log('Product IDs copied to clipboard');
    } catch (error) {
      console.error('Failed to copy product IDs:', error);
    }
  };

  // Handle bulk operations
  const handleBulkAction = (action: any, indices?: number[]) => {
    switch (action) {
      case 'selectAll':
        bulkOperations.selectAll();
        break;
      case 'deselectAll':
        bulkOperations.deselectAll();
        break;
      case 'removeSelected':
        bulkOperations.removeSelected();
        break;
      case 'validateSelected':
        bulkOperations.validateSelected();
        break;
      case 'clearAll':
        clearForm();
        break;
    }
  };

  // Render success state
  if (pageState === 'success' && batchResult) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <BatchSuccessConfirmation
          batchResult={batchResult}
          metrics={metrics}
          showMetrics={true}
          showQRPreviews={true}
          maxQRPreviews={6}
          onNavigate={handleSuccessNavigation}
          onDownloadQR={handleQRDownload}
          onCopyProductIds={handleCopyProductIds}
        />
      </div>
    );
  }

  // Render error state
  if (pageState === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-red-200 bg-red-50 p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl">❌</span>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-red-900">
            Batch Creation Failed
          </h2>
          <p className="mb-6 text-red-800">
            {error || 'An unexpected error occurred while creating the batch.'}
          </p>
          <div className="space-x-3">
            <Button
              variant="outline"
              onClick={() => setPageState('form')}
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={() => console.log('Contact support')}
            >
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Render main form state
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Product Batch</h1>
        <p className="mt-2 text-gray-600">
          Log your cooperative&apos;s products with comprehensive verification and compliance checking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Main Form - 3 columns */}
        <div className="lg:col-span-3">
          <ProductBatchForm
            onSubmit={handleFormSubmit}
            loading={isSubmitting}
            maxBatchSize={100}
            onFormStateChange={(state) => {
              // Handle form state changes for external integrations
              console.log('Form state changed:', state);
            }}
            onBackup={handleBackup}
          />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Batch Summary */}
          <BatchSummary
            products={formState.products}
            validations={formState.productValidations}
            selectedProducts={selectedProducts}
            maxBatchSize={100}
            disabled={isSubmitting}
            onBulkAction={handleBulkAction}
            onSelectionChange={setSelectedProducts}
            processingMetrics={metrics}
            showAdvanced={showAdvancedStats}
          />

          {/* Advanced Options Toggle */}
          <Card className="p-4">
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showAdvancedStats}
                  onChange={(e) => setShowAdvancedStats(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="text-sm text-gray-700">Show advanced statistics</span>
              </label>
              
              <div className="text-xs text-gray-500">
                {hasChanges && (
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                    Unsaved changes
                  </div>
                )}
                {formState.lastBackup && (
                  <div>
                    Last backup: {formState.lastBackup.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="mb-3 font-medium text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateBatch()}
                className="w-full justify-start"
                disabled={isSubmitting}
              >
                Validate Batch
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveBackup}
                className="w-full justify-start"
                disabled={isSubmitting}
              >
                Save Backup
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearForm}
                className="w-full justify-start text-red-600"
                disabled={isSubmitting}
              >
                Clear Form
              </Button>
            </div>
          </Card>

          {/* Help & Support */}
          <Card className="p-4">
            <h3 className="mb-3 font-medium text-gray-900">Need Help?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Maximum 100 products per batch</p>
              <p>• Daily production limit: 1000kg</p>
              <p>• Processing time: &lt;2 minutes</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-0 text-primary-600"
                onClick={() => console.log('Show help documentation')}
              >
                View Documentation →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}