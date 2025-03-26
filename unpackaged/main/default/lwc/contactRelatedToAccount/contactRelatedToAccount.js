import { LightningElement, api, wire, track } from 'lwc';
import getContactsByAccountId from '@salesforce/apex/ContactController.getContactsByAccountId';
import updateContact from '@salesforce/apex/ContactController.updateContact';
import deleteContact from '@salesforce/apex/ContactController.deleteContact';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class ContactList extends LightningElement {
    @api recordId;
    @track contacts;
    @track error;
    wiredContacts;
    editedContact = null;
    originalValues = {}; // Stores original values for each contact separately

    @wire(getContactsByAccountId, { accountId: '$recordId' })
    wiredContactsData(result) {
        this.wiredContacts = result;
        if (result.data) {
            this.contacts = result.data.map(contact => ({
                ...contact,
                isEditing: false,
                disableSave: true
            }));
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.contacts = undefined;
        }
    }

    handleEdit(event) {
        const contactId = event.currentTarget.dataset.id;

        // Find the contact and store its original values separately
        const contact = this.contacts.find(c => c.Id === contactId);
        this.originalValues[contactId] = { 
            FirstName: contact.FirstName,
            Email: contact.Email, 
            Phone: contact.Phone 
        };

        this.contacts = this.contacts.map(contact => ({
            ...contact,
            isEditing: contact.Id === contactId // Only the selected row should be in edit mode
        }));

        this.editedContact = { Id: contactId };
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        const contactId = event.target.dataset.id;

        // Update edited contact object with new values
        this.editedContact[field] = event.target.value;

        // Enable the save button only if changes are made
        this.contacts = this.contacts.map(contact => ({
            ...contact,
            disableSave: contact.Id === contactId ? false : contact.disableSave
        }));
    }

    handleSave(event) {
        const contactId = event.currentTarget.dataset.id;

        updateContact({ contact: this.editedContact })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Contact updated successfully!',
                        variant: 'success'
                    })
                );
                this.editedContact = null;
                this.originalValues = {}; // Clear stored original values
                return refreshApex(this.wiredContacts);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating contact',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    handleCancel(event) {
        const contactId = event.currentTarget.dataset.id;

        // Restore only the specific contact's original values
        this.contacts = this.contacts.map(contact => {
            if (contact.Id === contactId) {
                return {
                    ...contact,
                    FirstName: this.originalValues[contactId]?.FirstName || contact.FirstName,
                    Email: this.originalValues[contactId]?.Email || contact.Email,
                    Phone: this.originalValues[contactId]?.Phone || contact.Phone,
                    isEditing: false
                };
            }
            return contact;
        });

        delete this.originalValues[contactId]; // Remove restored values from storage
    }

    handleDelete(event) {
        const contactId = event.currentTarget.dataset.id;
        if (confirm('Are you sure you want to delete this contact?')) {
            deleteContact({ contactId })
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Contact deleted successfully!',
                            variant: 'success'
                        })
                    );
                    return refreshApex(this.wiredContacts);
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error deleting contact',
                            message: error.body.message,
                            variant: 'error'
                        })
                    );
                });
        }
    }
}