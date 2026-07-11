We need to fix the account creation logic, first we need to add an otp system that sends a verification link to their email whenever an account is ceated at first, i will add the email details in the docker .env file later, also in the settings we have the enable otp functionality, ensure it works well, an otp must be sent and then it should indicate that 2fa has been enables, now the bigges issue is the account creation flow, first when creating a new account we should be able to choose which haus, then after that create a business owner account ,then for staff they should first input their emails, and then the system should fetch which hause and levele (staff, branch manager etc its belings to), remeber, we cannot create a staff account out of thin air, staff and branch manager accounts must be created by the business owner.

when a client creates an account they should not be forced to choose a hause they just login, taken to a sort of hoem page that has top filter for the different hauses and also whenthey choose the hause they should get to see the different businesses registered under that hasue they should click on and then and only tehn do they move to the dashboard to book appointments and so forth

anyone who enables 2fa should get an email first before they can proceed

these are the credentials, # Email and SMTP configuration
      # SMTP_HOST: smtp.gmail.com
      # SMTP_PORT: 587
      # SMTP_USER: digitalwilderness9@gmail.com
      # SMTP_PASSWORD: jszzdlklziqdnrya
      # EMAIL_FROM_ADDRESS: digitalwilderness9@gmail.com
      # EMAIL_FROM_NAME: 
      # SMTP_USE_TLS: false
      # SMTP_USE_STARTTLS: true
      # EMAIL_DRY_RUN: false