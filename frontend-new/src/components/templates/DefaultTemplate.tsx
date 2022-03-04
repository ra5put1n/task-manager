import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Flex } from '../../styles'
import CalendarSidebar from '../calendar/CalendarSidebar'
import Navbar from '../organisms/NavigationView'

interface DefaultTemplateProps {
    children: JSX.Element | JSX.Element[]
}
const DefaultTemplate = ({ children }: DefaultTemplateProps) => {
    return (
        <View style={styles.container}>
            <Navbar />
            {children}
            <CalendarSidebar />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        ...Flex.row,
        height: '100vh'
    }
})

export default DefaultTemplate
