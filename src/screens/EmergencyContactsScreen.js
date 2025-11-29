import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import ContactsService from '../services/ContactsService';
import Contacts from 'react-native-contacts';
import {PermissionsAndroid} from 'react-native';

export default function EmergencyContactsScreen({navigation}) {
  const [contacts, setContacts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });
  const [medicalInfo, setMedicalInfo] = useState({
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
    insuranceInfo: '',
  });

  useEffect(() => {
    loadContacts();
    loadMedicalInfo();
  }, []);

  const loadContacts = async () => {
    const loadedContacts = await ContactsService.getEmergencyContacts();
    setContacts(loadedContacts);
  };

  const loadMedicalInfo = async () => {
    const info = await ContactsService.getMedicalInfo();
    setMedicalInfo(info);
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }

    try {
      await ContactsService.addEmergencyContact(newContact);
      setNewContact({name: '', phone: '', relationship: ''});
      setShowAddModal(false);
      loadContacts();
      Alert.alert('Success', 'Emergency contact added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add contact');
    }
  };

  const handleDeleteContact = contactId => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ContactsService.deleteEmergencyContact(contactId);
            loadContacts();
          },
        },
      ],
    );
  };

  const handleSetPrimary = async contactId => {
    await ContactsService.setPrimaryContact(contactId);
    loadContacts();
  };

  const handleImportFromContacts = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission denied');
          return;
        }
      }

      Contacts.getAll().then(deviceContacts => {
        if (deviceContacts.length > 0) {
          const contact = deviceContacts[0];
          setNewContact({
            name: `${contact.givenName} ${contact.familyName}`,
            phone: contact.phoneNumbers[0]?.number || '',
            relationship: '',
          });
        }
      });
    } catch (error) {
      console.error('Error importing contact:', error);
      Alert.alert('Error', 'Failed to import contact');
    }
  };

  const handleSaveMedicalInfo = async () => {
    try {
      await ContactsService.saveMedicalInfo(medicalInfo);
      setShowMedicalModal(false);
      Alert.alert('Success', 'Medical information saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save medical information');
    }
  };

  const renderContactItem = ({item}) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        {item.relationship && (
          <Text style={styles.contactRelationship}>{item.relationship}</Text>
        )}
        {item.isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryText}>PRIMARY</Text>
          </View>
        )}
      </View>
      <View style={styles.contactActions}>
        {!item.isPrimary && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleSetPrimary(item.id)}>
            <Text style={styles.primaryButtonText}>Set Primary</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteContact(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergency Contacts</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.medicalButton}
          onPress={() => setShowMedicalModal(true)}>
          <Text style={styles.medicalButtonText}>
            💊 Medical Info
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No emergency contacts added</Text>
            <Text style={styles.emptySubtext}>
              Add contacts who will be notified in case of an accident
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}>
        <Text style={styles.addButtonText}>+ Add Emergency Contact</Text>
      </TouchableOpacity>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#666"
              value={newContact.name}
              onChangeText={text =>
                setNewContact({...newContact, name: text})
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              value={newContact.phone}
              onChangeText={text =>
                setNewContact({...newContact, phone: text})
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g., Spouse, Parent)"
              placeholderTextColor="#666"
              value={newContact.relationship}
              onChangeText={text =>
                setNewContact({...newContact, relationship: text})
              }
            />

            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImportFromContacts}>
              <Text style={styles.importButtonText}>
                📱 Import from Contacts
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddContact}>
                <Text style={styles.saveButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Medical Info Modal */}
      <Modal
        visible={showMedicalModal}
        animationType="slide"
        transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Medical Information</Text>
            <Text style={styles.modalSubtitle}>
              This info will be shown to first responders
            </Text>

            <Text style={styles.inputLabel}>Blood Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., O+, A-, B+"
              placeholderTextColor="#666"
              value={medicalInfo.bloodType}
              onChangeText={text =>
                setMedicalInfo({...medicalInfo, bloodType: text})
              }
            />

            <Text style={styles.inputLabel}>Allergies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any allergies"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              value={medicalInfo.allergies}
              onChangeText={text =>
                setMedicalInfo({...medicalInfo, allergies: text})
              }
            />

            <Text style={styles.inputLabel}>Current Medications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List medications you're taking"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              value={medicalInfo.medications}
              onChangeText={text =>
                setMedicalInfo({...medicalInfo, medications: text})
              }
            />

            <Text style={styles.inputLabel}>Medical Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Diabetes, Asthma"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              value={medicalInfo.conditions}
              onChangeText={text =>
                setMedicalInfo({...medicalInfo, conditions: text})
              }
            />

            <Text style={styles.inputLabel}>Insurance Information</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Policy number, provider"
              placeholderTextColor="#666"
              multiline
              numberOfLines={2}
              value={medicalInfo.insuranceInfo}
              onChangeText={text =>
                setMedicalInfo({...medicalInfo, insuranceInfo: text})
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMedicalModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveMedicalInfo}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    color: '#00ff00',
    fontSize: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  medicalButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  medicalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
  },
  contactCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactInfo: {
    marginBottom: 10,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  contactPhone: {
    fontSize: 16,
    color: '#00d4ff',
    marginBottom: 5,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#888',
  },
  primaryBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  primaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginRight: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addButton: {
    backgroundColor: '#00ff00',
    margin: 20,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  modalContentLarge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    margin: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#00ff00',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  importButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#00ff00',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});