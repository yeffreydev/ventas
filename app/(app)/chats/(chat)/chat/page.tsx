'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Spinner } from 'flowbite-react';
import { useChatLogic } from './hooks/useChatLogic';
import ChatHeader from './components/ChatHeader';
import MessagesList from './components/MessagesList';
import MessageInput from './components/MessageInput';
import ContactSidebar from './components/ContactSidebar';
import CustomerSelectorModal from './components/CustomerSelectorModal';
import LinkConfirmationModal from './components/LinkConfirmationModal';
import ChatOrderForm from './components/ChatOrderForm';
import ReminderModal from './components/ReminderModal';
import CustomerDetailModal from './components/CustomerDetailModal';
import ScheduledMessageModal from './components/ScheduledMessageModal';

function ChatPage() {
  const router = useRouter();
  
  // Use custom hook for all chat logic
  const {
    // State
    selectedConv,
    messages,
    loadingMessages,
    fetchingMessages,
    initialLoad,
    conversationNotFound,
    messageInput,
    setMessageInput,
    sendingMessage,
    selectedFiles,
    showContactInfo,
    setShowContactInfo,
    chatReference,
    loadingChatReference,
    showCustomerSelector,
    setShowCustomerSelector,
    availableCustomers,
    customerSearchTerm,
    setCustomerSearchTerm,
    selectedCustomerToLink,
    showLinkConfirmation,
    customerTags,
    loadingTags,
    customerAttributes,
    loadingAttributes,
    showAttributeForm,
    setShowAttributeForm,
    newAttributeName,
    setNewAttributeName,
    newAttributeValue,
    setNewAttributeValue,
    newAttributeType,
    setNewAttributeType,
    newAttributeOptions,
    setNewAttributeOptions,
    editingAttributeId,
    setEditingAttributeId,
    showOrderForm,
    setShowOrderForm,
    customerOrders,
    loadingOrders,
    showTemplateSelector,
    setShowTemplateSelector,
    templateSearchQuery,
    setTemplateSearchQuery,
    isSSEConnected,
    isPolling,
    showReminderModal,
    setShowReminderModal,
    reminderMessageContext,
    reminders,
    loadingReminders,
    showProductSelector,
    setShowProductSelector,
    showCustomerDetailModal,
    setShowCustomerDetailModal,
    currentWorkspace,

    // Refs
    fileInputRef,
    messagesContainerRef,
    messageRefs,
    
    // Handlers
    handleScroll,
    handleAddAttribute,
    handleUpdateAttribute,
    handleDeleteAttribute,
    handleSelectCustomerToLink,
    handleConfirmLinkCustomer,
    handleCancelLinkCustomer,
    handleUnlinkCustomer,
    handleFileSelect,
    handleRemoveFile,
    handleSendMessage,
    formatTime,
    loadCustomerOrders,
    handleCreateReminderFromMessage,
    handleCreateReminderFromInput,
    handleSaveReminder,
    handleUpdateReminder,
    handleDeleteReminder,
    handleProductSelect,
    initialScrollDone,
    customerAttributeDefinitions,
    customerNotes,
    loadingNotes,
    customerActivities,
    loadingActivities,
    handleAddNote,
    handleDeleteNote,
    availableTags,
    handleAddTag,
    handleRemoveTag,
    scheduledMessages,
    loadingScheduledMessages,
    showScheduledMessageModal,
    setShowScheduledMessageModal,
    handleCreateScheduledMessage,
    handleCancelScheduledMessage,
  } = useChatLogic();

  // Local state for notifications
  const [showOrderSuccessNotification, setShowOrderSuccessNotification] = useState(false);

  // Redirect if conversation not found
  useEffect(() => {
    if (conversationNotFound) {
      alert('La conversación no existe o ya no está disponible');
      router.push('/chats');
    }
  }, [conversationNotFound, router]);

  const getOrderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'failure' | 'info' }> = {
      pending: { label: 'Pendiente', color: 'warning' },
      processing: { label: 'Procesando', color: 'info' },
      completed: { label: 'Completado', color: 'success' },
      cancelled: { label: 'Cancelado', color: 'failure' }
    };
    const config = statusConfig[status] || { label: status, color: 'info' };
    return <Badge color={config.color} size="sm">{config.label}</Badge>;
  };

  return (
    <>
      {/* Middle - Chat Messages */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {initialLoad ? (
          /* Initial loading state - show minimalist spinner */
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <Spinner size="md" />
          </div>
        ) : selectedConv ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              selectedConv={selectedConv}
              showContactInfo={showContactInfo}
              setShowContactInfo={setShowContactInfo}
              chatReference={chatReference}
              setShowOrderForm={setShowOrderForm}
              isSSEConnected={isSSEConnected}
              isPolling={isPolling}
            />

            {/* Messages List */}
            <MessagesList
              messages={messages}
              loadingMessages={loadingMessages}
              fetchingMessages={fetchingMessages}
              selectedConv={selectedConv}
              formatTime={formatTime}
              messagesContainerRef={messagesContainerRef}
              handleScroll={handleScroll}
              messageRefs={messageRefs}
              onCreateReminder={handleCreateReminderFromMessage}
              initialScrollDone={initialScrollDone}
            />

            {/* Message Input - Fixed at bottom */}
            <MessageInput
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              selectedFiles={selectedFiles}
              handleFileSelect={handleFileSelect}
              handleRemoveFile={handleRemoveFile}
              handleSendMessage={handleSendMessage}
              sendingMessage={sendingMessage}
              fileInputRef={fileInputRef}
              showTemplateSelector={showTemplateSelector}
              setShowTemplateSelector={setShowTemplateSelector}
              templateSearchQuery={templateSearchQuery}
              setTemplateSearchQuery={setTemplateSearchQuery}
              onCreateReminder={handleCreateReminderFromInput}
              showProductSelector={showProductSelector}
              setShowProductSelector={setShowProductSelector}
              onProductSelect={handleProductSelect}
              workspaceId={currentWorkspace?.id}
            />
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            Selecciona una conversación para ver los mensajes
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Info */}
      {selectedConv && showContactInfo && (
        <ContactSidebar
          selectedConv={selectedConv}
          chatReference={chatReference}
          loadingChatReference={loadingChatReference}
          customerTags={customerTags}
          loadingTags={loadingTags}
          customerAttributes={customerAttributes}
          loadingAttributes={loadingAttributes}
          customerOrders={customerOrders}
          loadingOrders={loadingOrders}
          reminders={reminders}
          loadingReminders={loadingReminders}
          onUpdateReminder={handleUpdateReminder}
          onDeleteReminder={handleDeleteReminder}
          showAttributeForm={showAttributeForm}
          setShowAttributeForm={setShowAttributeForm}
          newAttributeName={newAttributeName}
          setNewAttributeName={setNewAttributeName}
          newAttributeValue={newAttributeValue}
          setNewAttributeValue={setNewAttributeValue}
          newAttributeType={newAttributeType}
          setNewAttributeType={setNewAttributeType}
          newAttributeOptions={newAttributeOptions}
          setNewAttributeOptions={setNewAttributeOptions}
          editingAttributeId={editingAttributeId}
          setEditingAttributeId={setEditingAttributeId}
          handleAddAttribute={handleAddAttribute}
          handleUpdateAttribute={handleUpdateAttribute}
          handleDeleteAttribute={handleDeleteAttribute}
          handleUnlinkCustomer={handleUnlinkCustomer}
          setShowCustomerSelector={setShowCustomerSelector}
          setShowOrderForm={setShowOrderForm}
          getOrderStatusBadge={getOrderStatusBadge}
          onViewCustomerDetails={() => setShowCustomerDetailModal(true)}
          customerAttributeDefinitions={customerAttributeDefinitions}
          customerNotes={customerNotes}
          loadingNotes={loadingNotes}
          customerActivities={customerActivities}
          loadingActivities={loadingActivities}
          handleAddNote={handleAddNote}
          handleDeleteNote={handleDeleteNote}
          availableTags={availableTags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onCreateReminder={() => setShowReminderModal(true)}
          scheduledMessages={scheduledMessages}
          loadingScheduledMessages={loadingScheduledMessages}
          onCreateScheduledMessage={() => setShowScheduledMessageModal(true)}
          onCancelScheduledMessage={handleCancelScheduledMessage}
        />
      )}

      {/* Customer Selector Modal */}
      <CustomerSelectorModal
        showCustomerSelector={showCustomerSelector}
        setShowCustomerSelector={setShowCustomerSelector}
        customerSearchTerm={customerSearchTerm}
        setCustomerSearchTerm={setCustomerSearchTerm}
        availableCustomers={availableCustomers}
        handleSelectCustomerToLink={handleSelectCustomerToLink}
      />

      {/* Link Confirmation Modal */}
      <LinkConfirmationModal
        showLinkConfirmation={showLinkConfirmation}
        selectedCustomerToLink={selectedCustomerToLink}
        handleConfirmLinkCustomer={handleConfirmLinkCustomer}
        handleCancelLinkCustomer={handleCancelLinkCustomer}
      />

      {/* Order Form Modal */}
      {showOrderForm && chatReference && currentWorkspace && (
        <ChatOrderForm
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            setShowOrderForm(false);
            if (chatReference.customer_id) {
              loadCustomerOrders(chatReference.customer_id);
            }
            setShowOrderSuccessNotification(true);
            // Auto-hide after 3 seconds
            setTimeout(() => setShowOrderSuccessNotification(false), 3000);
          }}
          customerId={chatReference.customer_id}
          customerName={chatReference.customer_name}
          workspaceId={currentWorkspace.id}
        />
      )}

      {/* Reminder Modal */}
      <ReminderModal
        show={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
        }}
        onSave={handleSaveReminder}
        initialContent={reminderMessageContext?.content || ''}
      />

      {/* Scheduled Message Modal */}
      <ScheduledMessageModal
        show={showScheduledMessageModal}
        onClose={() => setShowScheduledMessageModal(false)}
        onSave={handleCreateScheduledMessage}
      />

      {/* Customer Detail Modal */}
      {showCustomerDetailModal && chatReference && (
        <CustomerDetailModal
          customerId={chatReference.customer_id}
          onClose={() => setShowCustomerDetailModal(false)}
          onUpdate={() => {
            if (chatReference.customer_id) {
              // Reload customer data
              loadCustomerOrders(chatReference.customer_id);
            }
          }}
        />
      )}

      {/* Success Notification Toast */}
      {showOrderSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3 min-w-[320px]">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">¡Pedido creado exitosamente!</h4>
              <p className="text-xs text-text-secondary mt-0.5">El pedido ha sido registrado correctamente</p>
            </div>
            <button
              onClick={() => setShowOrderSuccessNotification(false)}
              className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Wrapper component with Suspense
export default function ChatPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4">Cargando conversación...</p>
        </div>
      </div>
    }>
      <ChatPage />
    </Suspense>
  );
}
