import { Skeleton } from "@mui/material";

export default function ChartSkeleton() {
  return(
    <div style={{display:'flex', height:'100%'}}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',marginBottom: '49px' }}>
        <Skeleton variant="text" height={'30px'} width={'135px'} />
      </div>
      <div style={{ display: 'flex', marginBottom: '35px', flexDirection:'column' }}>
        <Skeleton variant="text" height={'40px'} width={'180px'} style={{marginBottom:'5px'}} />
        <Skeleton variant="text" height={'40px'} width={'180px'} style={{marginBottom:'5px'}} />
        <Skeleton variant="text" height={'40px'} width={'180px'} style={{marginBottom:'5px'}} />
        <Skeleton variant="text" height={'40px'} width={'180px'} style={{marginBottom:'5px'}} />
        <Skeleton variant="text" height={'40px'} width={'180px'} style={{marginBottom:'5px'}} />
      </div>
    </div>
    <div style={{width: '100%',height: '100%',padding: '55px 10px 60px 45px'}}>
        <Skeleton variant="rectangular" width={'100%'} height={'100%'}/>
    </div>
    </div>
  )
}
