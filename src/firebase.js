import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCOeii2jYWPhUTACPEFsqQClXc-iQBQSLo",
  authDomain: "cineforesta-34e77.firebaseapp.com",
  databaseURL: "https://cineforesta-34e77-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cineforesta-34e77",
  storageBucket: "cineforesta-34e77.firebasestorage.app",
  messagingSenderId: "555430963680",
  appId: "1:555430963680:web:6d40794808625c64de2385"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
