import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import createTask from '@salesforce/apex/TaskController.createTask';
import getAllContacts from '@salesforce/apex/TaskController.getAllContacts';
import ACCOUNT_FIELD from '@salesforce/schema/Contact.AccountId';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class TaskComponent extends LightningElement {
    @api recordId; // Contact Id
    @track subject = 'Call';
    @track dueDate;
    @track accountId;
    @track assignedTo;
    @track status = 'Not Started';
    @track contactId; // Stores selected Contact ID
    @track contactOptions = []; // Stores Contact picklist options

    subjectOptions = [
        { label: 'Call', value: 'Call' },
        { label: 'Email', value: 'Email' },
        { label: 'Send Letter', value: 'Send Letter' },
        { label: 'Send Quote', value: 'Send Quote' },
        { label: 'Other', value: 'Other' }
    ];

    statusOptions = [
        { label: 'Not Started', value: 'Not Started' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Waiting on someone else', value: 'Waiting on someone else' },
        { label: 'Deferred', value: 'Deferred' }
    ];

    @wire(getRecord, { recordId: '$recordId', fields: [ACCOUNT_FIELD] })
    wiredContact({ error, data }) {
        if (data) {
            this.accountId = getFieldValue(data, ACCOUNT_FIELD);
            this.contactId = this.recordId; // Default Contact ID
        } else if (error) {
            console.error('Error fetching account:', error);
        }
    }

    @wire(getAllContacts)
    wiredContacts({ error, data }) {
        if (data) {
            this.contactOptions = data.map(contact => ({ label: contact.Name, value: contact.Id }));
        } else if (error) {
            console.error('Error fetching contacts:', error);
        }
    }

    handleChange(event) {
        const { name, value } = event.target;
        this[name] = value;
    }

    handleSave() {
        if (!this.contactId) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Please select a Contact.',
                variant: 'error'
            }));
            return;
        }

        const taskData = {
            Subject: this.subject,
            ActivityDate: this.dueDate,
            WhatId: this.accountId, // Related To (Account)
            WhoId: this.contactId, // Contact (Lookup)
            OwnerId: this.assignedTo, // Assigned To (User)
            Status: this.status
        };

        createTask({ task: taskData })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: 'Task created successfully',
                    variant: 'success'
                }));
                this.subject = 'Call';
                this.dueDate = null;
                this.assignedTo = null;
                this.status = 'Not Started';
                this.contactId = this.recordId; // Reset to default Contact
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }));
            });
    }
}