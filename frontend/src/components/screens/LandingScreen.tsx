import { Navigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import { AUTHORIZATION_COOKE } from '../../constants'
import GoogleAuthScreen from './GoogleAuthScreen'

const LandingScreen = () => {
    if (Cookies.get(AUTHORIZATION_COOKE)) return <Navigate to="/overview" replace />
    return <GoogleAuthScreen />
}

export default LandingScreen
