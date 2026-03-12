        {/* ── PENDING: BUY ── show payment instruction + "I Have Paid" button */}
        {order.status === 'pending' && order.orderType === 'buy' && (
          <div className="mb-5">
            <CountdownTimer createdAt={order.createdAt} onExpire={handleTimerExpire} />
            {!timerExpired && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 text-center mb-4">
                  <span className="text-3xl block mb-2">💳</span>
                  <p className="text-blue-800 font-semibold text-sm mb-1">
                    Pay GHS{' '}
                    {typeof order.amountGhs === 'number' ? order.amountGhs.toFixed(2) : order.amountGhs}{' '}
                    using your selected payment method.
                  </p>
                  <p className="text-blue-600 text-xs">Once you have made the payment, click the button below.</p>
                </div>
                <button
                  onClick={handleSentPayment}
                  disabled={sending}
                  className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-bold py-4 rounded-xl transition-colors text-base shadow-md"
                >
                  {sending ? 'Processing…' : '✅ I Have Paid'}
                </button>
              </>
            )}
          </div>
        )}