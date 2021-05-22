import './App.css'
import React from 'react'
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './redux/store'
import { LANDING_PATH, SETTINGS_PATH, PRIVACY_PATH } from './constants'
import {useEffect} from 'react'
import {getAuthToken} from './helpers/utils'

import Header from './components/Header'
import Settings from './components/settings/Settings'
import LandingPage from './components/LandingPage'
import PrivacyPolicy from './components/PrivacyPolicy'

interface PrivateRouteProps {
  path: string,
  component: React.FC<any>,
}

const App: React.FC = () => {
  useEffect(() => {
    document.title = 'General Task'
  }, [])
  return (
    <Provider store={store}>
      <BrowserRouter>
      { getAuthToken() ? <Header/> : null }
        <Switch>
          {/* Settings page, only accessible if logged in */}
          <PrivateRoute path={SETTINGS_PATH} component={Settings}/>
	        
          <Route path={PRIVACY_PATH} component={PrivacyPolicy}/>

          {/* MAKE SURE THIS IS THE LAST ROUTE */}
          {/* base url, shows landing page if not logged in, shows tasks page if logged in */}
          <Route path={LANDING_PATH} component={LandingPage}/>
        </Switch>
      </BrowserRouter>
    </Provider>
  )
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ path, component: Component}: PrivateRouteProps) => (
  <Route path={path} render={(props) => (
    getAuthToken()
      ? <Component {...props} />
      : <Redirect to='/' />
  )} />
)

export default App
