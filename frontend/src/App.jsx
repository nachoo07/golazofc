
import Routing from "./routes/Routing";
import UsersProvider from "./context/user/UserContext";
import { LoginProvider } from "./context/login/LoginContext";
import { useLocation } from "react-router-dom";  // Importa useLocation
import StudentsProvider from "./context/student/StudentContext";
import SharesProvider from "./context/share/ShareContext";
import { AttendanceProvider } from "./context/attendance/AttendanceContext";
import { MotionProvider } from "./context/motion/MotionContext";
import EmailProvider from "./context/email/EmailContext";
import PaymentProvider from "./context/payment/PaymentContext";

function App() {
    const location = useLocation();

  return (
    <>
        <LoginProvider>
        <UsersProvider>
          <StudentsProvider>
            <AttendanceProvider>
              <SharesProvider>
                <EmailProvider>
                  <MotionProvider>
                    <PaymentProvider>

                    <Routing />
                    </PaymentProvider>
                  </MotionProvider>
                </EmailProvider>
              </SharesProvider>
            </AttendanceProvider>
          </StudentsProvider>
        </UsersProvider>
      </LoginProvider>
    </>
  )
}

export default App
