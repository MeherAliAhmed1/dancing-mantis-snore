"use client";

import React, { useState } from 'react';
import { NextStep, Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, Edit, Trash2, Mail, CalendarPlus, ListTodo, NotebookPen, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import EmailDraftModal from './EmailDraftModal';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import AssignTaskModal from './AssignTaskModal';
import AddNotesModal from './AddNotesModal'; // Import the new modal

interface NextStepItemProps {
  nextStep: NextStep;
  meeting: Meeting;
  onUpdate: (updatedNextStep: NextStep) => void;
  onDelete: (id: string) => void;
}

const NextStepItem: React.FC<NextStepItemProps> = ({ nextStep, meeting, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(nextStep.edited_text || nextStep.original_text);
  const [editedOwner, setEditedOwner] = useState(nextStep.owner || '');
  const [editedDueDate, setEditedDueDate] = useState(nextStep.due_date || '');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false); // State for add notes modal

  const handleSaveEdit = () => {
    onUpdate({
      ...nextStep,
      edited_text: editedText,
      owner: editedOwner,
      due_date: editedDueDate,
      status: nextStep.status === 'suggested' ? 'pending' : nextStep.status,
    });
    setIsEditing(false);
    showSuccess("Next step updated!");
  };

  const handleConfirm = () => {
    onUpdate({ ...nextStep, status: 'confirmed' });
    showSuccess("Next step confirmed!");
  };

  const handleOpenEmailModal = () => {
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = (to: string, subject: string, body: string) => {
    console.log("Simulating email send:", { to, subject, body });
    onUpdate({ ...nextStep, status: 'executed' });
    showSuccess("Email draft confirmed and next step marked as executed!");
  };

  const handleOpenScheduleModal = () => {
    setIsScheduleModalOpen(true);
  };

  const handleScheduleMeeting = (date: Date, time: string) => {
    console.log("Simulating meeting scheduled:", { date, time, title: meeting.title, participants: meeting.participants });
    onUpdate({ ...nextStep, status: 'executed' });
    showSuccess(`Meeting "${meeting.title}" scheduled for ${format(date, 'PPP')} at ${time}!`);
  };

  const handleOpenAssignTaskModal = () => {
    setIsAssignTaskModalOpen(true);
  };

  const handleAssignTask = (taskName: string, assignee: string, dueDate: string, destination: string) => {
    console.log("Simulating task assignment:", { taskName, assignee, dueDate, destination });
    onUpdate({ ...nextStep, status: 'executed' });
    showSuccess(`Task "${taskName}" assigned to ${assignee} in ${destination}!`);
  };

  const handleOpenNotesModal = () => {
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = (notesContent: string) => {
    onUpdate({ ...nextStep, notes: notesContent });
    showSuccess("Notes saved successfully!");
  };

  const handleDelete = () => {
    onDelete(nextStep.id);
    showError("Next step rejected/deleted.");
  };

  const displayStatus = (status: NextStep['status']) => {
    switch (status) {
      case 'suggested': return 'Suggested';
      case 'pending': return 'Pending Confirmation';
      case 'confirmed': return 'Confirmed';
      case 'executed': return 'Executed';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const isActionable = nextStep.status === 'suggested' || nextStep.status === 'pending';

  // Prepare initial email content
  const initialTo = meeting.participants?.filter(p => p !== meeting.user_id).join(', ') || '';
  const initialSubject = `Follow-up: ${meeting.title}`;
  const initialBody = `Hi team,\n\nRegarding our meeting "${meeting.title}", here's a follow-up on the next step:\n\n"${nextStep.edited_text || nextStep.original_text}"\n\nBest regards,\n${user?.name || 'Daily Action Hub User'}`;

  return (
    <>
      <div className="flex items-start justify-between p-3 border-t last:border-b-0 first:border-t-0 border-gray-200 dark:border-gray-700 bg-background hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md -mx-3">
        <div className="flex-1 pr-4">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <Label htmlFor={`edit-text-${nextStep.id}`} className="sr-only">Next Step</Label>
                <Input
                  id={`edit-text-${nextStep.id}`}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="mb-1"
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="flex-1">
                  <Label htmlFor={`edit-owner-${nextStep.id}`} className="sr-only">Owner</Label>
                  <Input
                    id={`edit-owner-${nextStep.id}`}
                    placeholder="Owner (optional)"
                    value={editedOwner}
                    onChange={(e) => setEditedOwner(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`edit-due-date-${nextStep.id}`} className="sr-only">Due Date</Label>
                  <Input
                    id={`edit-due-date-${nextStep.id}`}
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => setEditedDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-2">
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm font-medium ${nextStep.status === 'executed' || nextStep.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {nextStep.edited_text || nextStep.original_text}
              </p>
              {(nextStep.owner || nextStep.due_date) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {nextStep.owner && `Owner: ${nextStep.owner}`}
                  {nextStep.owner && nextStep.due_date && ' | '}
                  {nextStep.due_date && `Due: ${format(new Date(nextStep.due_date), 'MMM d, yyyy')}`}
                </p>
              )}
              {nextStep.notes && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <NotebookPen className="mr-1 h-3 w-3" /> Notes: {nextStep.notes.substring(0, 50)}{nextStep.notes.length > 50 ? '...' : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Status: {displayStatus(nextStep.status)}</p>
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex space-x-1">
            {isActionable && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleConfirm}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Confirm Next Step</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Next Step</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reject Next Step</TooltipContent>
                </Tooltip>
              </>
            )}
            {(nextStep.status === 'confirmed' || nextStep.status === 'executed') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleOpenEmailModal} className="cursor-pointer">
                    <Mail className="mr-2 h-4 w-4" /> Send Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenScheduleModal} className="cursor-pointer">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenAssignTaskModal} className="cursor-pointer">
                    <ListTodo className="mr-2 h-4 w-4" /> Assign Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenNotesModal} className="cursor-pointer">
                    <NotebookPen className="mr-2 h-4 w-4" /> {nextStep.notes ? 'Edit Notes' : 'Add Notes'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <EmailDraftModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        initialTo={initialTo}
        initialSubject={initialSubject}
        initialBody={initialBody}
        onSend={handleSendEmail}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        initialMeetingTitle={meeting.title}
        initialParticipants={meeting.participants || []}
        onSchedule={handleScheduleMeeting}
      />

      <AssignTaskModal
        isOpen={isAssignTaskModalOpen}
        onClose={() => setIsAssignTaskModalOpen(false)}
        initialTaskName={nextStep.edited_text || nextStep.original_text}
        initialAssignee={nextStep.owner}
        initialDueDate={nextStep.due_date}
        onAssign={handleAssignTask}
      />

      <AddNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        initialNotes={nextStep.notes}
        onSave={handleSaveNotes}
      />
    </>
  );
};

export default NextStepItem;