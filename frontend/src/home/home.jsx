import { useEffect } from "react"
import { useNavigate } from 'react-router-dom'

export default function Home(){

    const navigate = useNavigate()

    useEffect(()=>{
        const authDetect = async () => {
            return await (await fetch(
                `${import.meta.env.VITE_BACKEND_URI}/`,
                {
                    credentials: "include"
                }
            )
        ).json() }

        authDetect().then(response => {
            if(response.action == "login")
                navigate('/login')
        })
    }, [])

    return <>
        <h1>Home</h1>
    </>

}

