// import React from 'react'

// const PaymentPage = () => {
//         const [selectedPayment, setSelectedPayment] = useState("cod");
//         const [orderNotes, setOrderNotes] = useState("");
        
//   return (
//     <div>
//                     {/* 4. PAYMENT METHOD */}
//               <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//                 <h3 className="text-lg font-bold text-gray-900 mb-4">
//                   💳 Payment Method
//                 </h3>
    
//                 <div className="space-y-3">
//                   <label
//                     className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                       selectedPayment === "cod"
//                         ? "border-orange-500 bg-orange-50"
//                         : "border-gray-200 hover:border-orange-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="payment"
//                       checked={selectedPayment === "cod"}
//                       onChange={() => setSelectedPayment("cod")}
//                       className="w-5 h-5 text-orange-500 focus:ring-orange-500"
//                     />
//                     <span className="ml-3 font-semibold text-gray-900">
//                       💰 Cash on Delivery
//                     </span>
//                   </label>

//                   <label
//                     className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                       selectedPayment === "upi"
//                         ? "border-orange-500 bg-orange-50"
//                         : "border-gray-200 hover:border-orange-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="payment"
//                       checked={selectedPayment === "upi"}
//                       onChange={() => setSelectedPayment("upi")}
//                       className="w-5 h-5 text-orange-500 focus:ring-orange-500"
//                     />
//                     <span className="ml-3 font-semibold text-gray-900">
//                       📱 UPI (Google Pay / PhonePe / Paytm)
//                     </span>
//                   </label>

//                   <label
//                     className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                       selectedPayment === "card"
//                         ? "border-orange-500 bg-orange-50"
//                         : "border-gray-200 hover:border-orange-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="payment"
//                       checked={selectedPayment === "card"}
//                       onChange={() => setSelectedPayment("card")}
//                       className="w-5 h-5 text-orange-500 focus:ring-orange-500"
//                     />
//                     <span className="ml-3 font-semibold text-gray-900">
//                       💳 Credit/Debit Card
//                     </span>
//                   </label>

//                   <label
//                     className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
//                       selectedPayment === "wallet"
//                         ? "border-orange-500 bg-orange-50"
//                         : "border-gray-200 hover:border-orange-300"
//                     }`}
//                   >
//                     <input
//                       type="radio"
//                       name="payment"
//                       checked={selectedPayment === "wallet"}
//                       onChange={() => setSelectedPayment("wallet")}
//                       className="w-5 h-5 text-orange-500 focus:ring-orange-500"
//                     />
//                     <span className="ml-3 font-semibold text-gray-900">
//                       👛 Digital Wallet
//                     </span>
//                   </label>
//                 </div>
//               </div>

//               {/* 5. ORDER NOTES */}
//               <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-lg">
//                 <h3 className="text-lg font-bold text-gray-900 mb-4">
//                   📝 Special Instructions (Optional)
//                 </h3>
//                 <textarea
//                   value={orderNotes}
//                   onChange={(e) => setOrderNotes(e.target.value)}
//                   placeholder="e.g., Less spicy, No onions, Ring doorbell twice..."
//                   className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm resize-none"
//                   rows="3"
//                 />
//               </div>
//     </div>
//   )
// }

// export default PaymentPage
