import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTACTS_KEY = '@emergency_contacts';
const MEDICAL_INFO_KEY = '@medical_info';

class ContactsService {
  // Emergency Contacts Management
  async getEmergencyContacts() {
    try {
      const contacts = await AsyncStorage.getItem(CONTACTS_KEY);
      return contacts ? JSON.parse(contacts) : [];
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  async addEmergencyContact(contact) {
    try {
      const contacts = await this.getEmergencyContacts();
      const newContact = {
        id: Date.now().toString(),
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contacts.length === 0, // First contact is primary
        createdAt: new Date().toISOString(),
      };
      contacts.push(newContact);
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
      return newContact;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  async updateEmergencyContact(contactId, updates) {
    try {
      const contacts = await this.getEmergencyContacts();
      const index = contacts.findIndex(c => c.id === contactId);
      if (index !== -1) {
        contacts[index] = {...contacts[index], ...updates};
        await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
        return contacts[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  async deleteEmergencyContact(contactId) {
    try {
      const contacts = await this.getEmergencyContacts();
      const filtered = contacts.filter(c => c.id !== contactId);
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  async setPrimaryContact(contactId) {
    try {
      const contacts = await this.getEmergencyContacts();
      const updated = contacts.map(c => ({
        ...c,
        isPrimary: c.id === contactId,
      }));
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error setting primary contact:', error);
      throw error;
    }
  }

  async getPrimaryContact() {
    try {
      const contacts = await this.getEmergencyContacts();
      return contacts.find(c => c.isPrimary) || contacts[0] || null;
    } catch (error) {
      console.error('Error getting primary contact:', error);
      return null;
    }
  }

  // Medical Info Management
  async getMedicalInfo() {
    try {
      const info = await AsyncStorage.getItem(MEDICAL_INFO_KEY);
      return info
        ? JSON.parse(info)
        : {
            bloodType: '',
            allergies: '',
            medications: '',
            conditions: '',
            insuranceInfo: '',
          };
    } catch (error) {
      console.error('Error getting medical info:', error);
      return null;
    }
  }

  async saveMedicalInfo(medicalInfo) {
    try {
      await AsyncStorage.setItem(MEDICAL_INFO_KEY, JSON.stringify(medicalInfo));
      return true;
    } catch (error) {
      console.error('Error saving medical info:', error);
      throw error;
    }
  }
}

export default new ContactsService();