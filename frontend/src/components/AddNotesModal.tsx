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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface AddNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes?: string;
  onSave: (notes: string) => void;
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  saveLabel?: string;
}

const AddNotesModal: React.FC<AddNotesModalProps> = ({
  isOpen,
  onClose,
  initialNotes,
  onSave,
  title = "Add Notes",
  description = "Add or edit notes for this item.",
  label = "Notes",
  placeholder = "Type your notes here...",
  saveLabel = "Save Notes",
}) => {
  const [notes, setNotes] = useState(initialNotes || '');

  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes || ''); // Reset notes when opening
    }
  }, [isOpen, initialNotes]);

  const handleSaveClick = () => {
    onSave(notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="notes-textarea" className="font-medium">{label}</Label>
            <Textarea
              id="notes-textarea"
              placeholder={placeholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[180px]"
            />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveClick}>
            <Save className="mr-2 h-4 w-4" /> {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNotesModal;