import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Notificaciones from './components/Notificaciones'
import Home from './pages/Home'
import Catalogo from './pages/Catalogo'
import Cotizador from './pages/Cotizador'
import Checkout from './pages/Checkout'
import Confirmacion from './pages/Confirmacion'
import Pedidos from './pages/Pedidos'
import Agenda from './pages/Agenda'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/cotizador" element={<Cotizador />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmacion" element={<Confirmacion />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/agenda" element={<Agenda />} />
          </Routes>
        </main>
        <Footer />
        <Notificaciones />
      </div>
    </BrowserRouter>
  )
}

export default App
