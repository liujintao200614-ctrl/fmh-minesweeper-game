export default function handler(req, res) {
  console.log('🧪 Test API called');
  
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}