"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTaskName: string;
  initialAssignee?: string;
  initialDueDate?: string;
  onAssign: (taskName: string, assignee: string, dueDate: string, destination: string) => void;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  initialTaskName,
  initialAssignee,
  initialDueDate,
  onAssign,
}) => {
  const [taskName, setTaskName] = useState(initialTaskName);
  const [assignee, setAssignee] = useState(initialAssignee || '');
  const [dueDate, setDueDate] = useState(initialDueDate || format(new Date(), 'yyyy-MM-dd'));
  const [destination, setDestination] = useState('Notion'); // Default destination

  useEffect(() => {
    if (isOpen) {
      setTaskName(initialTaskName);
      setAssignee(initialAssignee || '');
      setDueDate(initialDueDate || format(new Date(), 'yyyy-MM-dd'));
      setDestination('Notion'); // Reset to default
    }
  }, [isOpen, initialTaskName, initialAssignee, initialDueDate]);

  const handleAssignClick = () => {
    if (taskName.trim() && assignee.trim() && dueDate.trim() && destination.trim()) {
      onAssign(taskName, assignee, dueDate, destination);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">Assign Task</DialogTitle>
          <DialogDescription>
            Create a task in your connected tool.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="task-name" className="text-right font-medium">
              Task Name
            </Label>
            <Input
              id="task-name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignee" className="text-right font-medium">
              Assignee
            </Label>
            <Input
              id="assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="due-date" className="text-right font-medium">
              Due Date
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destination" className="text-right font-medium">
              Destination
            </Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Notion">Notion (Mock)</SelectItem>
                <SelectItem value="Granola">Granola (Mock)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssignClick} disabled={!taskName.trim() || !assignee.trim() || !dueDate.trim() || !destination.trim()}>
            <CheckCircle className="mr-2 h-4 w-4" /> Confirm & Assign (Mock)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTaskModal;