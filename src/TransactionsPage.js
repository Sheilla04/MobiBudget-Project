import React, { useState, useEffect } from 'react';
import UploadPDF from './UploadFile';
import { useAddTransaction } from './hooks/useAddTransaction';
import useEditTransaction from './hooks/useEditTransaction';
import { useDeleteTransaction } from './hooks/useDeleteTransaction';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from './config/firebase-config';
import { useGetUserInfo } from './hooks/useGetUserInfo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import Swal from 'sweetalert2';
import './TransactionsPage.css';
import { calculateCost } from './hooks/costCalculations';  // Import calculateCost

const TransactionsPage = () => {
  const { addTransaction } = useAddTransaction();
  const {
    show,
    editData,
    setEditData,
    handleEditTransaction,
    handleClose,
    handleShow,
  } = useEditTransaction();

  const { handleDeleteTransaction } = useDeleteTransaction();
  const userInfo = useGetUserInfo();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    transactionType: '',
    category: '',
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userInfo) return;

      const transactionsCollectionRef = collection(db, 'transactions');
      const q = query(transactionsCollectionRef, where('uid', '==', userInfo));
      const transactionsSnapshot = await getDocs(q);
      const fetchedTransactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date ? doc.data().date.toDate() : null,
      }));
      setTransactions(fetchedTransactions);
    };

    fetchTransactions();
  }, [userInfo, show]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFormChange = (e) => {
    if (!userInfo) return;
    const { name, value } = e.target;
    if (editData) {
      setEditData({
        ...editData,
        [name]: value,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const validateForm = (data) => {
    if (!data.amount || !data.transactionType || !data.category) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all fields before submitting.',
      });
      return false;
    }
    return true;
  };

  const handleAddTransaction = async () => {
    if (!validateForm(formData)) return;

    const { amount, transactionType, category } = formData;
    const cost = calculateCost(amount, transactionType, category);

    Swal.fire({
      title: 'Adding transaction...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const timestamp = Timestamp.fromDate(new Date());
      await addTransaction(userInfo, { ...formData, date: timestamp, cost });
      setTransactions([...transactions, { ...formData, date: new Date(), cost }]);
      setFormData({
        amount: '',
        transactionType: '',
        category: '',
      });
      handleClose();
      Swal.fire({
        icon: 'success',
        title: 'Transaction added successfully!',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add transaction. Please try again.',
      });
    }
  };

  const handleDelete = async (transactionId) => {
    await handleDeleteTransaction(transactionId);
    setTransactions(transactions.filter((transaction) => transaction.id !== transactionId));
  };

  const handleUpdateTransaction = async (updatedData) => {
    if (!validateForm(updatedData)) return;

    const { amount, transactionType, category } = updatedData;
    updatedData.cost = calculateCost(amount, transactionType, category);

    Swal.fire({
      title: 'Updating transaction...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const { id, ...restData } = updatedData;
    const transactionDocRef = doc(db, 'transactions', id);

    try {
      await updateDoc(transactionDocRef, restData);
      const updatedTransactions = transactions.map(transaction =>
        transaction.id === id ? { ...transaction, ...restData } : transaction
      );
      setTransactions(updatedTransactions);
      handleClose();
      Swal.fire({
        icon: 'success',
        title: 'Transaction updated successfully!',
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update transaction. Please try again.',
      });
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (transaction.category) {
      return transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  const transactionOptions = {
    Receiving: ['Till customer payment', 'Paybill(Mgao Tariff)', 'Paybill (Bouquet tariff)'],
    Sending: ['Till to till payment', 'Till to number payment', 'B2C(Registered users)', 'B2C(Unregistered users)'],
    Withdrawal: ['Normal', 'B2C charges'],
  };

  return (
    <div className="transactions-page">
      <h2>Transactions</h2>
      <UploadPDF />
      <div className="controls">
        <input
          type="text"
          placeholder="Search by category..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Transaction Type</th>
            <th>Category</th>
            <th>Cost</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((transaction, index) => (
            <tr key={index}>
              <td>{getTimeAgo(transaction.date)}</td>
              <td>{transaction.amount}</td>
              <td>{transaction.transactionType}</td>
              <td>{transaction.category}</td>
              <td>{transaction.cost}</td>
              <td>
                <FontAwesomeIcon
                  icon={faEdit}
                  onClick={() => handleEditTransaction(transaction)}
                  style={{ cursor: 'pointer', marginRight: '18px', color: 'blue' }}
                />
                <FontAwesomeIcon
                  icon={faTrash}
                  onClick={() => handleDelete(transaction.id)}
                  style={{ cursor: 'pointer', color: 'red' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="button-group">
        <button onClick={handleShow}>Add Transaction</button>
      </div>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editData ? 'Edit Transaction' : 'Add Transaction'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="form-group">
              <label htmlFor="amount">Amount:</label>
              <input
                type="number"
                className="form-control"
                id="amount"
                name="amount"
                value={editData ? editData.amount : formData.amount}
                onChange={handleFormChange}
                placeholder="Enter amount"
              />
            </div>
            <div className="form-group">
              <label htmlFor="transactionType">Transaction Type:</label>
              <Form.Select
                aria-label="Default select example"
                id="transactionType"
                name="transactionType"
                value={editData ? editData.transactionType : formData.transactionType}
                onChange={handleFormChange}
              >
                <option>Select Type of Transaction</option>
                <option value="Receiving">Receiving</option>
                <option value="Sending">Sending</option>
                <option value="Withdrawal">Withdrawal</option>
              </Form.Select>
            </div>
            <div className="form-group">
              <label htmlFor="category">Category:</label>
              <Form.Select
                aria-label="Default select example"
                id="category"
                name="category"
                value={editData ? editData.category : formData.category}
                onChange={handleFormChange}
                disabled={!formData.transactionType}
              >
                <option>Select Category</option>
                {formData.transactionType && transactionOptions[formData.transactionType].map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </Form.Select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          {editData ? (
            <Button variant="primary" onClick={() => handleUpdateTransaction(editData)}>
              Update Transaction
            </Button>
          ) : (
            <Button variant="primary" onClick={handleAddTransaction}>
              Add Transaction
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TransactionsPage;